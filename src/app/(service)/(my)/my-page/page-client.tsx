'use client';

import { Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { type Dispatch, useEffect, useReducer, useRef, useState } from 'react';
import type {
  MyClassProfilePatchRequestJobsEnum,
  MyClassProfileResponse,
} from '@/api/openapi/models';
import Button from '@/components/common/ui/button';
import IconButton from '@/components/common/ui/icon-button';
import LogoLoading from '@/components/common/ui/logo-loading';
import { ToggleSwitch } from '@/components/common/ui/toggle/switch';
import { useNicknameCheckQuery } from '@/hooks/queries/auth/use-nickname-check';
import { useMyCommunityContextQuery } from '@/hooks/queries/community/use-community-discovery-query';
import { useMyRepQuery } from '@/hooks/queries/community/use-community-room-posts-query';
import {
  useMyClassProfileQuery,
  usePatchMyClassProfileMutation,
} from '@/hooks/queries/user/use-my-class-profile-query';
import {
  useCareersQuery,
  useJobsQuery,
} from '@/hooks/queries/user/use-update-user-profile-mutation';
import { useToastStore } from '@/stores/use-toast-store';
import { useUserStore } from '@/stores/use-user-store';
import type { CareerResponse, JobResponse } from '@/types/api/my-page.types';
import {
  getDefaultAvatarSrc,
  getRandomDefaultAvatarSrc,
} from '@/utils/avatar-utils';
import { formatPhoneNumber } from '@/utils/format';
import { formatDateTimeDot } from '@/utils/time';

const WithdrawalConfirmModal = dynamic(
  () => import('./_components/withdrawal-confirm-modal'),
  { ssr: false },
);

const PhoneVerificationModal = dynamic(
  () => import('@/components/common/modals/phone-verification-modal'),
  { ssr: false },
);

const EmailVerificationModal = dynamic(
  () => import('@/components/common/modals/email-verification-modal'),
  { ssr: false },
);

interface ProfileFormEditing {
  job: boolean;
  career: boolean;
  goal: boolean;
}

interface ProfileFormState {
  nickname: string;
  intro: string;
  goal: string;
  selectedJob: string;
  selectedCareer: string;
  vibeCodingExperienceLevel: string;
  nicknameToCheck: string;
  editing: ProfileFormEditing;
}

interface ProfileRowState {
  editing: ProfileFormEditing;
  selectedJob: string;
  selectedCareer: string;
  goal: string;
  vibeCodingExperienceLevel: string;
  jobs: JobResponse[] | undefined;
  careers: CareerResponse[] | undefined;
  profile: MyClassProfileResponse | undefined;
  dispatch: Dispatch<ProfileFormAction>;
  onSaveJob: () => void;
  onSaveCareer: () => void;
  onSaveGoal: () => void;
  onSaveVibeCoding: () => void;
}

type ProfileFormAction =
  | {
      type: 'hydrate';
      values: Pick<
        ProfileFormState,
        | 'nickname'
        | 'intro'
        | 'goal'
        | 'selectedJob'
        | 'selectedCareer'
        | 'vibeCodingExperienceLevel'
      >;
    }
  | { type: 'setNickname'; value: string }
  | { type: 'setIntro'; value: string }
  | { type: 'setGoal'; value: string }
  | { type: 'setSelectedJob'; value: string }
  | { type: 'setSelectedCareer'; value: string }
  | { type: 'setNicknameToCheck'; value: string }
  | { type: 'setVibeCodingExperienceLevel'; value: string }
  | { type: 'editAll' }
  | { type: 'editField'; field: keyof ProfileFormEditing }
  | { type: 'collapseField'; field: keyof ProfileFormEditing };

const INITIAL_PROFILE_FORM: ProfileFormState = {
  nickname: '',
  intro: '',
  goal: '',
  selectedJob: '',
  selectedCareer: '',
  vibeCodingExperienceLevel: '',
  nicknameToCheck: '',
  editing: { job: false, career: false, goal: false },
};

function profileFormReducer(
  state: ProfileFormState,
  action: ProfileFormAction,
): ProfileFormState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.values };
    case 'setNickname':
      // 닉네임을 바꾸면 직전 중복확인 결과는 무효가 되므로 함께 비운다.
      return { ...state, nickname: action.value, nicknameToCheck: '' };
    case 'setIntro':
      return { ...state, intro: action.value };
    case 'setGoal':
      return { ...state, goal: action.value };
    case 'setSelectedJob':
      return { ...state, selectedJob: action.value };
    case 'setSelectedCareer':
      return { ...state, selectedCareer: action.value };
    case 'setNicknameToCheck':
      return { ...state, nicknameToCheck: action.value };
    case 'setVibeCodingExperienceLevel':
      return { ...state, vibeCodingExperienceLevel: action.value };
    case 'editAll':
      return {
        ...state,
        editing: {
          job: true,
          career: true,
          goal: true,
        },
      };
    case 'editField':
      return {
        ...state,
        editing: { ...state.editing, [action.field]: true },
      };
    case 'collapseField':
      return {
        ...state,
        editing: { ...state.editing, [action.field]: false },
      };
    default:
      return state;
  }
}

function ProfileRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-100 sm:flex-row sm:items-center sm:gap-400">
      <span className="font-designer-16r text-text-default sm:w-2500 sm:shrink-0">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const VIBE_CODING_OPTIONS = [
  {
    value: 'CURIOUS_NO_EXPERIENCE',
    label: 'AI 툴(챗GPT, 노션AI 등)을 써본 적 없어요',
  },
  {
    value: 'COPY_PASTE_WITH_AI',
    label: 'AI한테 질문하고 답변 활용해본 적 있어요',
  },
  {
    value: 'TRIED_WITH_AI_BUT_GAVE_UP',
    label: 'AI랑 같이 만들다가 막혀서 포기한 적이 있어요',
  },
  {
    value: 'BUILT_WORKING_RESULT',
    label: '원하는대로 동작하는 결과물을 만들어본 적 있어요',
  },
  {
    value: 'DEPLOYED_AND_SHARED',
    label: '배포까지 해서 실제로 쓰거나 남에게 보여준 적 있어요',
  },
] as const;

// 편집 토글형 프로필 행(관심도/직무/연차/목표). 본문 분리용 추출.
function ProfileEditableRows({
  editing,
  selectedJob,
  selectedCareer,
  goal,
  vibeCodingExperienceLevel,
  jobs,
  careers,
  profile,
  dispatch,
  onSaveJob,
  onSaveCareer,
  onSaveGoal,
  onSaveVibeCoding,
}: ProfileRowState) {
  return (
    <>
      <ProfileRow label="바이브 코딩 관심도">
        <div className="flex items-start gap-200">
          <select
            value={vibeCodingExperienceLevel}
            onChange={(e) =>
              dispatch({
                type: 'setVibeCodingExperienceLevel',
                value: e.target.value,
              })
            }
            className="border-border-default rounded-100 font-designer-14r text-text-default flex-1 border px-200 py-150 outline-none"
          >
            <option value="">선택해 주세요.</option>
            {VIBE_CODING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            color="outlined"
            size="medium"
            onClick={onSaveVibeCoding}
            className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand"
          >
            저장
          </Button>
        </div>
      </ProfileRow>

      <ProfileRow label="직무">
        {editing.job ? (
          <div className="flex items-start gap-200">
            <select
              value={selectedJob}
              onChange={(e) =>
                dispatch({
                  type: 'setSelectedJob',
                  value: e.target.value,
                })
              }
              className="border-border-default rounded-100 font-designer-14r text-text-default flex-1 border px-200 py-150 outline-none"
            >
              <option value="">직무를 선택해 주세요.</option>
              {jobs?.map((j) => (
                <option key={j.job} value={j.job}>
                  {j.description}
                </option>
              ))}
            </select>
            <Button
              type="button"
              color="outlined"
              size="medium"
              onClick={onSaveJob}
              className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand"
            >
              저장
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-200">
            <span className="font-designer-16r text-text-default">
              {jobs?.find((j) => j.job === profile?.jobs?.[0])?.description ??
                '없음'}
            </span>
            <Button
              type="button"
              color="outlined"
              size="xsmall"
              onClick={() => dispatch({ type: 'editField', field: 'job' })}
              className="h-auto shrink-0 rounded-50 px-200 py-50 font-designer-14m"
            >
              변경
            </Button>
          </div>
        )}
      </ProfileRow>

      <ProfileRow label="연차">
        {editing.career ? (
          <div className="flex items-start gap-200">
            <select
              value={selectedCareer}
              onChange={(e) =>
                dispatch({
                  type: 'setSelectedCareer',
                  value: e.target.value,
                })
              }
              className="border-border-default rounded-100 font-designer-14r text-text-default flex-1 border px-200 py-150 outline-none"
            >
              <option value="">연차를 선택해 주세요.</option>
              {careers?.map((c) => (
                <option key={c.career} value={c.career}>
                  {c.description}
                </option>
              ))}
            </select>
            <Button
              type="button"
              color="outlined"
              size="medium"
              onClick={onSaveCareer}
              className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand"
            >
              저장
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-200">
            <span className="font-designer-16r text-text-default">
              {careers?.find((c) => c.career === profile?.career)
                ?.description ?? '없음'}
            </span>
            <Button
              type="button"
              color="outlined"
              size="xsmall"
              onClick={() => dispatch({ type: 'editField', field: 'career' })}
              className="h-auto shrink-0 rounded-50 px-200 py-50 font-designer-14m"
            >
              변경
            </Button>
          </div>
        )}
      </ProfileRow>

      <ProfileRow label="만들어보고 싶은 것">
        {editing.goal ? (
          <div className="flex items-start gap-200">
            <textarea
              aria-label="만들어보고 싶은 것"
              value={goal}
              onChange={(e) =>
                dispatch({
                  type: 'setGoal',
                  value: e.target.value,
                })
              }
              placeholder="만들어보고 싶은 것을 입력해 주세요."
              className="border-border-default rounded-100 font-designer-14r text-text-default placeholder:text-text-subtlest h-2413 flex-1 resize-none border p-150 px-200 outline-none"
            />
            <Button
              type="button"
              color="outlined"
              size="medium"
              onClick={onSaveGoal}
              className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand"
            >
              저장
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-200">
            <span className="font-designer-16r text-text-default">
              {profile?.learningGoal ?? '없음'}
            </span>
            <Button
              type="button"
              color="outlined"
              size="xsmall"
              onClick={() => dispatch({ type: 'editField', field: 'goal' })}
              className="h-auto shrink-0 rounded-50 px-200 py-50 font-designer-14m"
            >
              변경
            </Button>
          </div>
        )}
      </ProfileRow>
    </>
  );
}

function ProfileSection({
  profile,
}: {
  profile: MyClassProfileResponse | undefined;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, dispatch] = useReducer(profileFormReducer, INITIAL_PROFILE_FORM);
  const {
    nickname,
    intro,
    goal,
    selectedJob,
    selectedCareer,
    vibeCodingExperienceLevel,
    nicknameToCheck,
    editing,
  } = form;

  const { mutateAsync: patchProfile, isPending } =
    usePatchMyClassProfileMutation();
  const { data: jobs } = useJobsQuery();
  const { data: careers } = useCareersQuery();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleToggleEdit = () => {
    setIsEditOpen((prev) => {
      if (!prev) dispatch({ type: 'editAll' });
      return !prev;
    });
  };

  const collapseField = (field: keyof ProfileFormEditing) =>
    dispatch({ type: 'collapseField', field });

  useEffect(() => {
    if (!profile) return;
    dispatch({
      type: 'hydrate',
      values: {
        nickname: profile.nickname ?? '',
        intro: profile.selfIntroduction ?? '',
        goal: profile.learningGoal ?? '',
        selectedJob: profile.jobs?.[0] ?? '',
        selectedCareer: profile.career ?? '',
        vibeCodingExperienceLevel: profile.vibeCodingExperienceLevel ?? '',
      },
    });
  }, [profile]);

  const {
    isFetching: checkingNickname,
    isSuccess: nicknameAvailable,
    isError: nicknameTaken,
  } = useNicknameCheckQuery(nicknameToCheck, !!nicknameToCheck);

  // 프로필 요약 줄(예: "3주차 · 방 3개 정착")은 이미 존재하는 커뮤니티 컨텍스트 API를 재사용한다.
  const { data: communityContext } = useMyCommunityContextQuery();
  const summaryParts = [
    communityContext?.weeksTogetherLabel,
    typeof communityContext?.rooms.count === 'number'
      ? `방 ${communityContext.rooms.count}개 정착`
      : undefined,
  ].filter((part): part is string => Boolean(part));
  const summaryLine =
    summaryParts.length > 0
      ? summaryParts.join(' · ')
      : '아직 활동 기록이 없어요. 커뮤니티 방에 참여해 보세요.';
  // 공개 프로필 경로는 GET /api/v1/community/rep/context 응답의 publicProfileUrl에서 온다.
  // 이미 "/members/{uuid}" 형태로 완성된 경로라 그대로 링크에 쓴다(앞에 다시 붙이지 않는다).
  const publicProfileUrl =
    typeof communityContext?.publicProfileUrl === 'string' &&
    communityContext.publicProfileUrl.length > 0
      ? communityContext.publicProfileUrl
      : undefined;

  const currentNickname = profile?.nickname;
  const isSameNickname = nickname === currentNickname;

  const memberId = useUserStore((s) => s.memberId);
  const savedImageUrl =
    profile?.profileImage?.resizedImages?.[0]?.resizedImageUrl;
  const fallbackAvatarSrc = getDefaultAvatarSrc(
    memberId,
    profile?.profileImageNumber,
  );
  const [failedSavedImageUrl, setFailedSavedImageUrl] = useState<string | null>(
    null,
  );
  const shouldUseSavedImage =
    Boolean(savedImageUrl) && savedImageUrl !== failedSavedImageUrl;
  const avatarUrl =
    previewUrl ??
    (shouldUseSavedImage && savedImageUrl ? savedImageUrl : fallbackAvatarSrc);

  const handleSaveNickname = async () => {
    try {
      await patchProfile({ profileField: 'NICKNAME', nickname });
      showToast('닉네임이 저장되었습니다.', 'success');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleSaveIntro = async () => {
    try {
      await patchProfile({
        profileField: 'SELF_INTRODUCTION',
        selfIntroduction: intro,
      });
      showToast('자기소개가 저장되었습니다.', 'success');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleSaveJob = async () => {
    if (!selectedJob) return;
    try {
      await patchProfile({
        profileField: 'JOBS',
        jobs: [selectedJob as MyClassProfilePatchRequestJobsEnum],
      });
      showToast('직무가 저장되었습니다.', 'success');
      collapseField('job');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleSaveCareer = async () => {
    if (!selectedCareer) return;
    try {
      await patchProfile({
        profileField: 'CAREER',
        career: selectedCareer as Parameters<typeof patchProfile>[0]['career'],
      });
      showToast('연차가 저장되었습니다.', 'success');
      collapseField('career');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleSaveGoal = async () => {
    try {
      await patchProfile({
        profileField: 'GOAL',
        learningGoal: goal,
      });
      showToast('목표가 저장되었습니다.', 'success');
      collapseField('goal');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  function fileExtToEnum(file: File): string {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'JPG';
    return ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'].includes(ext)
      ? ext
      : 'JPG';
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const result = await patchProfile({
        profileField: 'PROFILE_IMAGE_EXTENSION',
        profileImageFileExtension: fileExtToEnum(file) as Parameters<
          typeof patchProfile
        >[0]['profileImageFileExtension'],
      });
      if (result?.profileImageUploadUrl) {
        await fetch(result.profileImageUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
      }
      showToast('이미지가 변경되었습니다.', 'success');
    } catch {
      setPreviewUrl(null);
      showToast('이미지 업로드에 실패했습니다.', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRandomImage = async () => {
    const randomSrc = getRandomDefaultAvatarSrc(avatarUrl);
    setPreviewUrl(randomSrc);
    try {
      const res = await fetch(randomSrc);
      const blob = await res.blob();
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const result = await patchProfile({
        profileField: 'PROFILE_IMAGE_EXTENSION',
        profileImageFileExtension: 'PNG',
      });
      if (result?.profileImageUploadUrl) {
        await fetch(result.profileImageUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': 'image/png' },
        });
      }
      showToast('이미지가 변경되었습니다.', 'success');
    } catch {
      setPreviewUrl(null);
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleSaveVibeCoding = async () => {
    if (!vibeCodingExperienceLevel) return;
    try {
      await patchProfile({
        profileField: 'VIBE_CODING_EXPERIENCE_LEVEL',
        vibeCodingExperienceLevel: vibeCodingExperienceLevel as Parameters<
          typeof patchProfile
        >[0]['vibeCodingExperienceLevel'],
      });
      showToast('AI 활용 경험이 저장되었습니다.', 'success');
    } catch {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  return (
    <section className="flex flex-col gap-500">
      <div className="flex flex-col gap-300">
        <h1 className="font-designer-24b text-text-default">빌더 프로필</h1>

        {publicProfileUrl ? (
          <Link
            href={publicProfileUrl}
            scroll={false}
            className="flex min-h-550 items-center justify-center gap-100 rounded-150 border border-border-default px-300 py-150 font-designer-15m text-text-default sm:self-start"
          >
            <Eye aria-hidden="true" className="size-250" />
            남에게 보이는 내 프로필 보기
          </Link>
        ) : null}

        <div className="flex items-center gap-300 rounded-200 border border-border-subtle bg-white p-300">
          <div className="relative size-1000 shrink-0 overflow-hidden rounded-full bg-gray-200">
            <Image
              src={avatarUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex min-w-0 flex-col gap-50">
            <p className="font-designer-18b text-text-strong">
              {profile?.nickname ?? '빌더'}
            </p>
            <p className="font-designer-13r text-text-subtle">{summaryLine}</p>
            {profile?.selfIntroduction ? (
              <p className="line-clamp-2 font-designer-13r text-text-subtlest">
                {profile.selfIntroduction}
              </p>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          color="outlined"
          size="medium"
          onClick={handleToggleEdit}
          aria-expanded={isEditOpen}
          aria-controls="my-profile-edit"
          className="h-auto min-h-550 rounded-150 px-300 py-150 font-designer-15m sm:self-start"
        >
          {isEditOpen ? '프로필 편집 닫기' : '프로필 편집하기'}
        </Button>
      </div>

      {!isEditOpen ? null : (
        <div id="my-profile-edit" className="flex flex-col gap-500">
          <ProfileRow label="이미지">
            <div className="flex items-center gap-300">
              <div className="relative size-1375">
                <div className="relative size-1375 overflow-hidden rounded-full bg-gray-200">
                  <Image
                    src={avatarUrl}
                    alt="프로필 이미지"
                    fill
                    sizes="110px"
                    className="object-cover"
                    unoptimized
                    onError={() => {
                      if (!previewUrl && savedImageUrl) {
                        setFailedSavedImageUrl(savedImageUrl);
                      }
                    }}
                  />
                </div>
                <IconButton
                  size="sm"
                  onClick={handleRandomImage}
                  label="기본 이미지로 변경"
                  className="absolute bottom-0 right-0 flex size-425 items-center justify-center rounded-full bg-gray-200"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className="text-text-subtlest"
                  >
                    <path
                      d="M6.99996 6.99994H17V8.78994C17 9.23994 17.54 9.45994 17.85 9.13994L20.64 6.34994C20.84 6.14994 20.84 5.83994 20.64 5.63994L17.85 2.84994C17.54 2.53994 17 2.75994 17 3.20994V4.99994H5.99996C5.44996 4.99994 4.99996 5.44994 4.99996 5.99994V9.99994C4.99996 10.5499 5.44996 10.9999 5.99996 10.9999C6.54996 10.9999 6.99996 10.5499 6.99996 9.99994V6.99994ZM17 16.9999H6.99996V15.2099C6.99996 14.7599 6.45996 14.5399 6.14996 14.8599L3.35996 17.6499C3.15996 17.8499 3.15996 18.1599 3.35996 18.3599L6.14996 21.1499C6.45996 21.4599 6.99996 21.2399 6.99996 20.7899V18.9999H18C18.55 18.9999 19 18.5499 19 17.9999V13.9999C19 13.4499 18.55 12.9999 18 12.9999C17.45 12.9999 17 13.4499 17 13.9999V16.9999Z"
                      fill="currentColor"
                    />
                  </svg>
                </IconButton>
              </div>
              <Button
                type="button"
                color="outlined"
                size="xsmall"
                onClick={() => fileInputRef.current?.click()}
                className="h-auto rounded-150 bg-white p-125 font-designer-15r text-text-subtlest"
              >
                이미지 변경하기
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </ProfileRow>

          <ProfileRow label="닉네임">
            <div className="flex flex-col gap-100">
              <div className="flex flex-wrap gap-200">
                <input
                  type="text"
                  aria-label="닉네임"
                  value={nickname}
                  onChange={(e) =>
                    dispatch({
                      type: 'setNickname',
                      value: e.target.value,
                    })
                  }
                  maxLength={16}
                  placeholder="닉네임을 입력하세요 (2~16자)"
                  className="border-border-default rounded-100 font-designer-14r text-text-default placeholder:text-text-subtlest min-w-0 flex-1 border px-200 py-150 outline-none"
                />
                <div className="flex gap-200">
                  <Button
                    type="button"
                    color="outlined"
                    size="medium"
                    disabled={
                      isSameNickname ||
                      nickname.length < 2 ||
                      nickname.length > 16 ||
                      checkingNickname
                    }
                    onClick={() =>
                      dispatch({
                        type: 'setNicknameToCheck',
                        value: nickname,
                      })
                    }
                    className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand disabled:border-gray-300 disabled:text-gray-400"
                  >
                    {checkingNickname ? '확인 중...' : '중복 확인'}
                  </Button>
                  <Button
                    type="button"
                    color="outlined"
                    size="medium"
                    disabled={
                      isPending ||
                      isSameNickname ||
                      !(nicknameAvailable && nicknameToCheck === nickname)
                    }
                    onClick={handleSaveNickname}
                    className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand disabled:border-gray-300 disabled:text-gray-400"
                  >
                    저장
                  </Button>
                </div>
              </div>
              {!isSameNickname &&
                nicknameAvailable &&
                nicknameToCheck === nickname && (
                  <p className="font-designer-12r text-green-700">
                    사용 가능한 닉네임입니다.
                  </p>
                )}
              {!isSameNickname &&
                nicknameTaken &&
                nicknameToCheck === nickname && (
                  <p className="font-designer-12r text-red-500">
                    이미 사용 중인 닉네임입니다.
                  </p>
                )}
            </div>
          </ProfileRow>

          <ProfileRow label="자기소개">
            <div className="flex items-start gap-200">
              <textarea
                aria-label="자기소개"
                value={intro}
                onChange={(e) =>
                  dispatch({
                    type: 'setIntro',
                    value: e.target.value,
                  })
                }
                maxLength={1000}
                placeholder="자신을 간략히 소개해 주세요."
                className="border-border-default rounded-100 font-designer-14r text-text-default placeholder:text-text-subtlest p-150 px-200 flex-1 resize-none border h-2413 outline-none"
              />
              <Button
                type="button"
                color="outlined"
                size="medium"
                disabled={isPending}
                onClick={handleSaveIntro}
                className="h-auto border-border-brand px-300 py-150 font-designer-14m text-text-brand disabled:opacity-50"
              >
                저장
              </Button>
            </div>
          </ProfileRow>

          <ProfileEditableRows
            editing={editing}
            selectedJob={selectedJob}
            selectedCareer={selectedCareer}
            goal={goal}
            vibeCodingExperienceLevel={vibeCodingExperienceLevel}
            jobs={jobs}
            careers={careers}
            profile={profile}
            dispatch={dispatch}
            onSaveJob={handleSaveJob}
            onSaveCareer={handleSaveCareer}
            onSaveGoal={handleSaveGoal}
            onSaveVibeCoding={handleSaveVibeCoding}
          />
        </div>
      )}
    </section>
  );
}

function BasicInfoSection({
  profile,
}: {
  profile: MyClassProfileResponse | undefined;
}) {
  const memberId = useUserStore((s) => s.memberId);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const isVerified = Boolean(profile?.phoneVerified);
  const phoneNumber = profile?.phoneNumber ?? '';
  const email = profile?.email ?? '';

  const showToast = useToastStore((state) => state.showToast);
  const { mutateAsync: patchProfile, isPending: isMarketingPending } =
    usePatchMyClassProfileMutation();
  const marketingConsent = Boolean(profile?.marketingConsent);

  const handleToggleMarketing = async (checked: boolean) => {
    try {
      await patchProfile({
        profileField: 'MARKETING_CONSENT',
        marketingConsent: checked,
      });
      showToast(
        checked
          ? '마케팅 수신에 동의했습니다.'
          : '마케팅 수신 동의를 해제했습니다.',
        'success',
      );
    } catch {
      showToast('마케팅 수신 설정 변경에 실패했습니다.', 'error');
    }
  };

  return (
    <section className="flex flex-col gap-500">
      <h2 className="font-designer-18b text-text-default">기본 정보</h2>

      <div className="flex flex-col gap-375">
        <ProfileRow label="인증완료">
          <span className="font-designer-16b text-text-default">
            {profile?.phoneVerified ? '본인 인증 완료' : '미인증'}
          </span>
        </ProfileRow>

        <ProfileRow label="이메일">
          <div className="flex items-center justify-between gap-125">
            <span className="min-w-0 truncate font-designer-16b text-text-default">
              {email || '등록된 이메일이 없습니다.'}
            </span>
            <Button
              type="button"
              color="outlined"
              size="xsmall"
              onClick={() => setEmailVerifyOpen(true)}
              className="h-auto shrink-0 border-border-brand bg-white p-125 font-designer-14m text-text-brand"
            >
              {email ? '변경' : '인증하기'}
            </Button>
          </div>
        </ProfileRow>

        <ProfileRow label="휴대폰 번호">
          <div className="flex flex-col gap-125">
            <div className="flex items-center justify-between rounded-100 border border-border-default p-125">
              <span className="font-designer-14m text-text-subtle">
                대한민국 +82
              </span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="shrink-0 text-text-subtle"
              >
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
              </svg>
            </div>
            <div className="flex gap-125">
              <input
                type="tel"
                disabled
                readOnly
                aria-label="휴대폰 번호"
                value={phoneNumber ? formatPhoneNumber(phoneNumber) : ''}
                placeholder="휴대폰 번호를 인증해주세요."
                className="min-w-0 flex-1 rounded-100 border border-border-default bg-gray-50 p-125 font-designer-14r text-text-default placeholder:text-text-subtlest outline-none"
              />
              <Button
                type="button"
                color="outlined"
                size="xsmall"
                onClick={() => setVerifyOpen(true)}
                className="h-auto shrink-0 border-border-brand bg-white p-125 font-designer-14m text-text-brand"
              >
                {isVerified ? '재인증' : '인증하기'}
              </Button>
            </div>
          </div>
        </ProfileRow>

        <ProfileRow label="마케팅 수신동의">
          <div className="flex items-center gap-200">
            <ToggleSwitch.Root
              checked={marketingConsent}
              disabled={isMarketingPending}
              onCheckedChange={handleToggleMarketing}
              size="lg"
              className="bg-border-subtle data-[state=checked]:bg-fill-brand-default-default"
            />
            <span className="font-designer-14r text-text-subtle">
              이벤트·혜택 등 마케팅 정보 수신에 동의합니다. (선택)
            </span>
          </div>
        </ProfileRow>
      </div>

      <PhoneVerificationModal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        memberId={memberId ?? undefined}
      />

      <EmailVerificationModal
        open={emailVerifyOpen}
        onOpenChange={setEmailVerifyOpen}
        initialEmail={email}
      />
    </section>
  );
}

export function ReputationSection() {
  const { data, isError, isLoading, refetch } = useMyRepQuery();

  return (
    <section className="flex flex-col gap-250" data-testid="my-reputation">
      <div className="flex items-center gap-100">
        <h2 className="font-designer-18b text-text-default">내 평판</h2>
        <span className="font-designer-11b bg-background-accent-rose-subtle text-text-brand rounded-full px-100 py-50">
          나만 보임
        </span>
      </div>

      <div className="border-border-subtle bg-background-default rounded-200 flex flex-col gap-200 border p-225 sm:p-300">
        <p className="font-designer-13r text-text-subtle leading-relaxed">
          도움됐다는 표시를 받은 기록입니다. 이 값은 다른 사람의 프로필에는
          나오지 않으며, 공개 순위나 등급으로 쓰지 않습니다.
        </p>

        {isLoading ? (
          <p className="font-designer-14m text-text-subtle" role="status">
            평판을 불러오는 중...
          </p>
        ) : isError || !data ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-150"
          >
            <p className="font-designer-14m text-text-subtle">
              평판을 불러오지 못했어요.
            </p>
            <Button
              type="button"
              color="outlined"
              size="small"
              onClick={() => refetch()}
            >
              다시 불러오기
            </Button>
          </div>
        ) : (
          <>
            <strong className="font-designer-34b text-text-strong tabular-nums">
              {data.repBalance.toLocaleString('ko-KR')}
            </strong>
            {data.recentEarns.length > 0 ? (
              <ul className="border-border-subtle divide-border-subtle divide-y border-t">
                {data.recentEarns.map((earn, index) => {
                  const content = (
                    <>
                      <span className="min-w-0">
                        <strong className="font-designer-14b text-text-strong block">
                          답이 도움됐다고 표시됐어요
                        </strong>
                        <time
                          dateTime={earn.at}
                          className="font-designer-12r text-text-subtle mt-25 block"
                        >
                          {formatDateTimeDot(earn.at)}
                        </time>
                      </span>
                      <strong className="font-designer-14b text-text-success shrink-0 tabular-nums">
                        +{earn.amount.toLocaleString('ko-KR')}
                      </strong>
                    </>
                  );

                  return (
                    <li key={`${earn.postId ?? 'unknown'}-${earn.at}-${index}`}>
                      {earn.postId ? (
                        <Link
                          href={`/community/${earn.postId}`}
                          className="hover:bg-background-neutral-subtle flex items-center justify-between gap-150 py-150 transition-colors"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between gap-150 py-150">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p
                role="status"
                className="font-designer-13r text-text-subtle border-border-subtle border-t pt-150"
              >
                아직 쌓인 평판 기록이 없어요. 답이 도움됐다고 표시되면 이곳에
                기록됩니다.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BannerSection() {
  return (
    <section className="flex flex-col gap-250 sm:flex-row">
      <a
        href="https://discord.gg/z66gzHnKp"
        target="_blank"
        rel="noopener noreferrer"
        className="border-[#D5D7DA] rounded-200 flex flex-1 items-center justify-center gap-175 overflow-hidden border bg-gray-50 py-250 transition-colors hover:bg-gray-100"
      >
        <div className="relative size-675 shrink-0 overflow-hidden rounded-150">
          <Image
            src="/my-page/discord-icon.png"
            alt="Discord"
            fill
            sizes="100px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-designer-20sb">
            <span className="text-text-brand">디스코드에서 함께 공부</span>
            <span className="text-text-strong">해요</span>
          </p>
          <p className="font-designer-16r text-text-strong">
            빌더들과 실시간 소통할 수 있어요!
          </p>
        </div>
      </a>

      <Link
        href="/builder-feed"
        className="border-border-brand rounded-200 flex flex-1 items-center justify-center gap-175 overflow-hidden border bg-white py-250 transition-colors hover:bg-gray-50"
      >
        <div className="relative size-675 shrink-0 overflow-hidden">
          <div className="absolute inset-[12.5%]">
            <Image
              src="/my-page/feed-icon.svg"
              alt="빌더 피드"
              fill
              sizes="100px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
        <div>
          <p className="font-designer-20sb">
            <span className="text-text-brand">빌더 피드</span>
            <span className="text-text-strong"> 확인하러 가기</span>
          </p>
          <p className="font-designer-16r text-text-strong">
            다른 빌더들과 결과물을 공유하며 소통해보세요!
          </p>
        </div>
      </Link>
    </section>
  );
}

export default function MyPage() {
  const { data: profile, isPending } = useMyClassProfileQuery();

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-150 py-600">
        <LogoLoading label="마이페이지를 불러오는 중" />
        <p className="font-designer-14r text-text-subtle">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-600 pb-600">
      <ProfileSection profile={profile} />

      <hr className="border-border-subtle" />

      <BasicInfoSection profile={profile} />

      <hr className="border-border-subtle" />

      <ReputationSection />

      <hr className="border-border-subtle" />

      <BannerSection />

      <hr className="border-border-subtle" />

      <section className="flex items-center justify-between gap-300">
        <div className="flex flex-col gap-50">
          <h2 className="font-designer-16b text-text-strong">계정 관리</h2>
          <p className="font-designer-13r text-text-subtle">
            탈퇴하면 계정 권한과 프로필 정보가 정리됩니다.
          </p>
        </div>
        <Button
          color="outlined"
          size="small"
          type="button"
          onClick={() => setWithdrawalOpen(true)}
          className="shrink-0 border-red-200 text-red-600 hover:bg-fill-danger-subtle-default"
        >
          계정 탈퇴
        </Button>
      </section>

      <WithdrawalConfirmModal
        open={withdrawalOpen}
        onOpenChange={setWithdrawalOpen}
      />
    </div>
  );
}
