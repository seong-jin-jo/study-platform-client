'use client';

import { Check, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { INTEREST_OPTIONS } from '@/config/class-onboarding-const';
import { useNicknameCheckQuery } from '@/hooks/queries/auth/use-nickname-check';
import {
  avatarSrcByNumber,
  getRandomDefaultAvatarNumber,
} from '@/utils/avatar-utils';
import {
  isValidNicknameFormat,
  NICKNAME_MAX_LENGTH,
  normalizeNicknameInput,
} from '@/utils/nickname-policy';
import type { StepProps } from '../onboarding-types';

// 개인정보처리방침(확정 공개 문서).
const PRIVACY_POLICY_URL =
  'https://gaan.notion.site/389fbb391d798087a519cda1255fdfc1';
// TODO(정책): 이용약관·마케팅 문서 작성 중 — 확정 시 각 실제 링크로 교체.
const POLICY_LINK_TODO =
  'https://www.notion.so/gaan/29bfbb391d7980fba669f8d4de741021';

type ConsentKey = 'privacyConsent' | 'termsConsent' | 'marketingConsent';

const CONSENTS: {
  key: ConsentKey;
  label: string;
  required: boolean;
  link: string;
}[] = [
  {
    key: 'privacyConsent',
    label: '개인정보 수집이용동의',
    required: true,
    link: PRIVACY_POLICY_URL,
  },
  {
    key: 'termsConsent',
    label: '서비스 이용약관동의',
    required: true,
    link: POLICY_LINK_TODO,
  },
  {
    key: 'marketingConsent',
    label: '마케팅 수신동의',
    required: false,
    link: POLICY_LINK_TODO,
  },
];

// 화면1 관심분야: 기획 4프레임 기준 5개(기타 제외)를 단일 선택으로 노출한다.
const FIRST_BUILD_OPTIONS = INTEREST_OPTIONS.filter((o) => !o.requiresEtc);

export function Step1Nickname({ data, updateData, onNext }: StepProps) {
  // 재개 시 서버에서 받은 닉네임은 이미 확정된 값으로 간주.
  const [preconfirmedNickname] = useState(() =>
    isValidNicknameFormat(data.nickname) ? data.nickname : '',
  );
  const [isCheckRequested, setIsCheckRequested] = useState(false);
  const didNormalizeInitialNickname = useRef(false);
  const isComposingNickname = useRef(false);

  useEffect(() => {
    if (didNormalizeInitialNickname.current) return;
    didNormalizeInitialNickname.current = true;

    const normalizedNickname = normalizeNicknameInput(data.nickname);
    if (data.nickname !== normalizedNickname) {
      updateData('nickname', normalizedNickname);
    }
  }, [data.nickname, updateData]);

  const isValidFormat = isValidNicknameFormat(data.nickname);
  const isPreconfirmed =
    !!preconfirmedNickname && data.nickname === preconfirmedNickname;

  const { data: nicknameCheck, isLoading: isChecking } = useNicknameCheckQuery(
    data.nickname,
    isCheckRequested && isValidFormat,
  );

  const isAvailable = nicknameCheck?.available ?? null;
  const showAvailable =
    isPreconfirmed || (isCheckRequested && !isChecking && isAvailable === true);
  const showTaken = isCheckRequested && !isChecking && isAvailable === false;

  const canProceed =
    isValidFormat &&
    showAvailable &&
    data.privacyConsent &&
    data.termsConsent &&
    !!data.interestId;

  const commitNickname = (value: string) => {
    const normalizedNickname = normalizeNicknameInput(value);
    if (normalizedNickname !== data.nickname) {
      updateData('nickname', normalizedNickname);
      setIsCheckRequested(false);
    }
    return normalizedNickname;
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent;
    if (isComposingNickname.current || nativeEvent.isComposing) {
      updateData('nickname', e.target.value);
      setIsCheckRequested(false);
      return;
    }

    commitNickname(e.target.value);
  };

  const handleNicknameCompositionStart = () => {
    isComposingNickname.current = true;
  };

  const handleNicknameCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    isComposingNickname.current = false;
    commitNickname(e.currentTarget.value);
  };

  const handleCheckNickname = () => {
    const normalizedNickname = commitNickname(data.nickname);
    if (!isValidNicknameFormat(normalizedNickname) || isChecking) return;
    setIsCheckRequested(true);
  };

  const handleShuffleAvatar = () => {
    updateData(
      'profileImageNumber',
      getRandomDefaultAvatarNumber(data.profileImageNumber),
    );
  };

  const toggleConsent = (key: ConsentKey) => {
    updateData(key, !data[key]);
  };

  return (
    <div className="flex flex-col gap-400 overflow-y-auto">
      {/* Profile avatar (랜덤 프리셋, 셔플) */}
      <div className="flex flex-col items-center gap-200">
        <div className="relative">
          <div className="size-1600 overflow-hidden rounded-full bg-rose-50">
            <Image
              src={avatarSrcByNumber(data.profileImageNumber ?? 1)}
              alt="프로필 아바타"
              width={128}
              height={128}
              className="size-full object-cover"
            />
          </div>
          <Button
            type="button"
            color="secondary"
            size="small"
            aria-label="랜덤 아바타 바꾸기"
            onClick={handleShuffleAvatar}
            className="absolute right-0 bottom-0 size-425 rounded-full bg-gray-200 p-0 transition-colors hover:bg-gray-300 active:bg-gray-300"
          >
            <RefreshCw className="size-200 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-100">
        <p className="font-designer-20b whitespace-pre-line text-gray-800">
          {'만나서 반가워요!\n닉네임을 정해주세요.'}
        </p>
        <p className="font-designer-14r text-gray-500">
          ZERO-ONE에서 사용할 이름입니다.
        </p>
      </div>

      {/* Nickname input */}
      <div className="flex flex-col gap-100">
        <div className="flex h-700 gap-150">
          <input
            type="text"
            aria-label="닉네임"
            value={data.nickname}
            onChange={handleNicknameChange}
            onCompositionStart={handleNicknameCompositionStart}
            onCompositionEnd={handleNicknameCompositionEnd}
            onBlur={(e) => commitNickname(e.currentTarget.value)}
            placeholder="닉네임을 입력해주세요(가입 후 변경 가능)"
            maxLength={NICKNAME_MAX_LENGTH}
            className={cn(
              'flex-1 rounded-150 border px-250 font-designer-14r text-gray-800 outline-none placeholder:text-gray-500 transition-colors',
              showTaken
                ? 'border-border-error focus:border-border-error'
                : 'border-gray-300 focus:border-border-brand',
            )}
          />
          <Button
            type="button"
            color="primary"
            size="large"
            aria-busy={isChecking}
            onClick={handleCheckNickname}
            disabled={!isValidFormat || isChecking}
            className="h-700 shrink-0 rounded-150 px-250 font-designer-14m disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isChecking ? (
              <Loader2 className="size-200 animate-spin" />
            ) : (
              '중복 확인'
            )}
          </Button>
        </div>
        <p
          className={cn(
            'min-h-225 font-designer-12r transition-colors',
            showTaken
              ? 'text-text-error'
              : showAvailable
                ? 'text-text-success'
                : !isValidFormat && data.nickname
                  ? 'text-text-error'
                  : 'text-text-subtlest',
          )}
        >
          {showTaken
            ? '이미 사용 중인 닉네임이에요'
            : showAvailable
              ? '사용 가능한 닉네임이에요'
              : !isValidFormat && data.nickname
                ? '공백 없이 2~20자 한글/영문/숫자만 가능해요'
                : '최소 2글자 이상 / 최대 20글자 이하'}
        </p>
      </div>

      {/* Consent checkboxes */}
      <div className="flex flex-col gap-425">
        {CONSENTS.map((consent) => (
          <div key={consent.key} className="flex items-center gap-150">
            <Button
              type="button"
              color="secondary"
              size="xsmall"
              className="h-auto flex-1 justify-start rounded-none bg-transparent p-0 hover:bg-transparent active:bg-transparent [&>span]:contents"
              onClick={() => toggleConsent(consent.key)}
            >
              <div
                className={cn(
                  'flex size-250 shrink-0 items-center justify-center rounded-50 border transition-colors',
                  data[consent.key]
                    ? 'border-rose-500 bg-rose-500'
                    : 'border-gray-300 bg-white',
                )}
              >
                {data[consent.key] && <Check className="size-150 text-white" />}
              </div>
              <span className="flex-1 text-left font-designer-14m text-gray-800">
                {consent.label}{' '}
                <span className="text-gray-500">
                  ({consent.required ? '필수' : '선택'})
                </span>
              </span>
            </Button>
            <a
              href={consent.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-designer-14m text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-700"
            >
              보기
            </a>
          </div>
        ))}
      </div>

      {/* First-build interest (단일 선택) */}
      <div className="flex flex-col gap-150">
        <div className="flex flex-col gap-100">
          <p className="font-designer-18b text-gray-800">
            AI를 활용해서 어떤 걸 가장 먼저 만들어 보고 싶으세요?
          </p>
          <p className="font-designer-14r text-gray-500">
            신규 코스 기획에 활용될 예정입니다.
          </p>
        </div>
        {FIRST_BUILD_OPTIONS.map((option) => {
          const selected = data.interestId === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              color="outlined"
              size="large"
              onClick={() => updateData('interestId', option.id)}
              className={cn(
                'h-700 w-full justify-start rounded-150 px-300 text-left transition-colors duration-200 [&>span]:contents',
                selected
                  ? 'border-rose-500 bg-rose-50 font-designer-16b text-rose-500 hover:bg-rose-50 active:bg-rose-50'
                  : 'border-gray-300 bg-white font-designer-16r text-gray-500 hover:border-rose-300 hover:bg-white active:bg-white',
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* CTA */}
      <Button
        type="button"
        color="primary"
        size="large"
        onClick={onNext}
        disabled={!canProceed}
        className="h-700 w-full disabled:bg-gray-200 disabled:text-gray-400"
      >
        다음
      </Button>
    </div>
  );
}
