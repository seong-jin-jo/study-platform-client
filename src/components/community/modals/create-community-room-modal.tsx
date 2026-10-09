'use client';

import { Plus } from 'lucide-react';
import Image from 'next/image';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { uploadCommunityRoomBanner } from '@/api/endpoints/community/community-room-hub';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import ImageUploadInput from '@/components/common/ui/image-upload-input';
import { BaseInput } from '@/components/common/ui/input';
import TextAreaInput from '@/components/common/ui/input/text-area';
import { Modal } from '@/components/common/ui/modal';
import { SelectableCard } from '@/components/common/ui/selectable-card';
import ToggleButton from '@/components/common/ui/toggle/button';
import { useCreateCommunityRoomMutation } from '@/hooks/queries/community/use-community-room-hub-query';
import type {
  CommunityRoomAxisTag,
  CommunityRoomHubResponse,
} from '@/types/community/room-hub';

const FORM_ID = 'create-community-room-form';

const BANNER_OPTIONS = [
  {
    src: '/community/rooms/room-banner-v2.jpg',
    alt: '늦은 밤 작업 중인 책상',
  },
  {
    src: '/community/rooms/thumb-automation-v2.jpg',
    alt: '자동화 화면',
  },
  {
    src: '/community/rooms/thumb-deploy-v2.jpg',
    alt: '배포 화면',
  },
  {
    src: '/community/rooms/thumb-database-v2.jpg',
    alt: '데이터 표 화면',
  },
  {
    src: '/community/rooms/thumb-envvars-v2.jpg',
    alt: '설정값 화면',
  },
  {
    src: '/community/rooms/thumb-payment-v2.jpg',
    alt: '결제 화면',
  },
] as const;

const FIRST_POST_SEEDS = [
  ['왜 이 방을 열었는지', '이 방을 왜 열었는지부터 적어 볼게요. 저는 '],
  ['내가 지금 막힌 곳', '제가 지금 막혀 있는 곳은 '],
  ['처음 온 사람에게', '처음 오신 분들은 여기부터 보시면 좋아요. '],
] as const;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const Field = ({
  children,
  hint,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
  label: string;
}) => {
  const content = (
    <>
      <span className="font-designer-12b text-text-strong">
        {label}
        {hint && (
          <span className="font-designer-11m text-text-subtlest ml-50">
            {hint}
          </span>
        )}
      </span>
      {children}
    </>
  );

  return htmlFor ? (
    <label htmlFor={htmlFor} className="flex flex-col gap-75">
      {content}
    </label>
  ) : (
    <div className="flex flex-col gap-75">{content}</div>
  );
};

interface RoomRuleDraft {
  id: string;
  body: string;
}

const INITIAL_RULES: RoomRuleDraft[] = [
  {
    id: 'rule-1',
    body: '뭘 하려다 어디서 막혔는지 세 줄이면 충분해요',
  },
  { id: 'rule-2', body: '화면을 찍어 붙이면 답이 더 빨라져요' },
];

export default function CreateCommunityRoomModal({
  activeRoomCount,
  activeRoomLimit,
  axes,
  onCreated,
  triggerClassName,
}: {
  activeRoomCount: number;
  activeRoomLimit: number;
  axes: CommunityRoomHubResponse['axes'];
  onCreated: (roomId: number) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerIntroduction, setOwnerIntroduction] = useState('');
  const [firstPostTitle, setFirstPostTitle] = useState('');
  const [firstPostBody, setFirstPostBody] = useState('');
  const [selectedTags, setSelectedTags] = useState({
    job: '',
    goal: '',
    level: '',
  });
  const [rules, setRules] = useState<RoomRuleDraft[]>(INITIAL_RULES);
  const [banner, setBanner] = useState<File>();
  const [selectedBannerPath, setSelectedBannerPath] = useState<string>(
    BANNER_OPTIONS[0].src,
  );
  const [submitError, setSubmitError] = useState<string>();
  const createMutation = useCreateCommunityRoomMutation();
  const previewUrl = useMemo(
    () => (banner ? URL.createObjectURL(banner) : undefined),
    [banner],
  );
  const isAtLimit = activeRoomCount >= activeRoomLimit;
  const completedFieldCount = [
    Boolean(name.trim()),
    true,
    Boolean(description.trim()),
    rules.length >= 2 && rules.every((rule) => Boolean(rule.body.trim())),
    Boolean(ownerIntroduction.trim()),
    Boolean(firstPostTitle.trim()),
    Boolean(firstPostBody.trim()),
  ].filter(Boolean).length;
  const remainingFieldCount = 7 - completedFieldCount;
  const hasAllAxisTags = Object.values(selectedTags).every(Boolean);
  const canSubmit = remainingFieldCount === 0 && hasAllAxisTags;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const reset = () => {
    setName('');
    setDescription('');
    setOwnerIntroduction('');
    setFirstPostTitle('');
    setFirstPostBody('');
    setSelectedTags({ job: '', goal: '', level: '' });
    setRules(INITIAL_RULES);
    setBanner(undefined);
    setSelectedBannerPath(BANNER_OPTIONS[0].src);
    setSubmitError(undefined);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && createMutation.isPending) return;
    setOpen(nextOpen);
  };

  const updateRule = (index: number, value: string) => {
    setRules((current) =>
      current.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, body: value } : rule,
      ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(undefined);

    const axisTags = [selectedTags.job, selectedTags.goal, selectedTags.level];
    if (
      axisTags.some((tag) => !tag) ||
      rules.some((rule) => !rule.body.trim()) ||
      !name.trim() ||
      !description.trim() ||
      !ownerIntroduction.trim() ||
      !firstPostTitle.trim() ||
      !firstPostBody.trim()
    ) {
      setSubmitError(
        '방 이름, 소개, 찾기 조건, 규칙, 내 소개와 첫 글을 모두 입력해 주세요.',
      );
      return;
    }

    try {
      const bannerFile =
        banner ??
        new File(
          [await (await fetch(selectedBannerPath)).blob()],
          selectedBannerPath.split('/').at(-1) ?? 'room-banner.jpg',
          { type: 'image/jpeg' },
        );
      const bannerAssetKey = await uploadCommunityRoomBanner(bannerFile);
      const response = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        bannerAssetKey,
        axisTags,
        rules: rules.map((rule, index) => ({
          order: index + 1,
          body: rule.body.trim(),
        })),
        ownerIntroduction: ownerIntroduction.trim(),
        firstPost: {
          title: firstPostTitle.trim(),
          contentHtml: `<p>${escapeHtml(firstPostBody.trim()).replaceAll('\n', '<br>')}</p>`,
          excerpt: firstPostBody.trim().slice(0, 200),
        },
      });
      setOpen(false);
      reset();
      onCreated(response.roomId);
    } catch {
      setSubmitError(
        '방을 만들지 못했어요. 입력 내용과 배너 업로드 상태를 확인해 주세요.',
      );
    }
  };

  const axisField = (
    axis: keyof CommunityRoomHubResponse['axes'],
    label: string,
    options: CommunityRoomAxisTag[],
  ) => (
    <fieldset
      data-testid={`community-room-create-${axis}`}
      className="flex flex-col gap-75"
    >
      <legend className="font-designer-11b text-text-subtlest">{label}</legend>
      <div className="flex flex-wrap gap-50">
        {options.map((tag) => {
          const isSelected = selectedTags[axis] === tag.code;

          return (
            <ToggleButton
              key={tag.code}
              pressed={isSelected}
              onPressedChange={() =>
                setSelectedTags((current) => ({
                  ...current,
                  [axis]: tag.code,
                }))
              }
              color="primary"
              size="sm"
              variant="round"
              className={cn(
                'font-designer-11b px-125 py-75',
                isSelected
                  ? 'data-[state=on]:border-border-brand data-[state=on]:bg-fill-brand-default-default data-[state=on]:text-text-inverse'
                  : 'data-[state=off]:border-border-subtle data-[state=off]:bg-background-default data-[state=off]:text-text-subtle hover:bg-fill-neutral-default-hover',
              )}
            >
              {tag.label}
            </ToggleButton>
          );
        })}
      </div>
    </fieldset>
  );

  const trigger = (
    <Button
      color="primary"
      size="medium"
      icon={<Plus />}
      disabled={isAtLimit}
      data-testid="community-room-create-trigger"
      className={triggerClassName}
    >
      방 만들기
    </Button>
  );

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Trigger asChild>{trigger}</Modal.Trigger>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content
          size="small"
          description="새 커뮤니티 방 만들기"
          className="max-w-xl rounded-250"
        >
          <Modal.Header variant="form" className="px-300 pt-300 pb-200">
            <div>
              <Modal.Title>방 만들기</Modal.Title>
              <p className="font-designer-13r text-text-subtle mt-50">
                빈 방으로 두지 않게 사진, 소개, 첫 글까지 채워야 열 수 있어요.
              </p>
            </div>
            <Modal.CloseButton aria-label="닫기" />
          </Modal.Header>
          <Modal.Body variant="form" className="px-300 py-250">
            <form
              id={FORM_ID}
              data-testid={FORM_ID}
              className="flex flex-col gap-200"
              onSubmit={handleSubmit}
            >
              <div>
                <div className="grid grid-cols-7 gap-50" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, index) => (
                    <span
                      key={index}
                      className={cn(
                        'bg-fill-neutral-default-default h-50 rounded-full',
                        index < completedFieldCount &&
                          'bg-fill-brand-default-default',
                      )}
                    />
                  ))}
                </div>
                <p className="font-designer-12m text-text-subtle mt-75">
                  <strong className="text-text-strong">
                    일곱 칸 가운데 {completedFieldCount}칸을 채우셨어요.
                  </strong>{' '}
                  다 채우면 아래 버튼이 켜집니다.
                </p>
              </div>
              <Field label="방 이름" htmlFor="community-room-create-name">
                <BaseInput
                  id="community-room-create-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onValueChange={setName}
                  placeholder="예: 노션으로 사이드프로젝트 관리 방"
                />
              </Field>
              <Field
                label="방을 찾는 조건"
                hint="직군, 목표, 난이도에서 각 1개"
              >
                <div className="border-border-subtlest bg-background-alternative rounded-150 flex flex-col gap-125 border p-125">
                  {axisField('job', '직군', axes.job)}
                  {axisField('goal', '목표', axes.goal)}
                  {axisField('level', '난이도', axes.level)}
                </div>
              </Field>
              <Field label="방 사진" hint="사진이 없으면 첫 번째 그림을 써요">
                <SelectableCard.Group
                  className="grid-cols-3 gap-75"
                  label="방 사진"
                  value={!banner ? selectedBannerPath : undefined}
                  onValueChange={(value) => {
                    setBanner(undefined);
                    setSelectedBannerPath(value);
                  }}
                >
                  {BANNER_OPTIONS.map((option) => {
                    return (
                      <SelectableCard.Item
                        key={option.src}
                        value={option.src}
                        className="h-725 overflow-hidden rounded-150 bg-background-disabled p-0 md:p-0"
                        media={
                          <Image
                            src={option.src}
                            alt=""
                            fill
                            sizes="160px"
                            className="object-cover"
                          />
                        }
                      >
                        <span className="sr-only">{option.alt}</span>
                      </SelectableCard.Item>
                    );
                  })}
                </SelectableCard.Group>
                <div className="border-border-subtle bg-background-alternative rounded-200 overflow-hidden border border-dashed">
                  <ImageUploadInput
                    image={previewUrl ?? selectedBannerPath}
                    onChangeImage={setBanner}
                  />
                </div>
              </Field>
              <Field
                label="방 소개"
                hint="누구를 위한 방인지 한두 줄"
                htmlFor="community-room-create-description"
              >
                <TextAreaInput
                  id="community-room-create-description"
                  value={description}
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="노션 하나로 사이드프로젝트 진행을 관리하고 싶은 사람들"
                  className="h-1000"
                />
              </Field>
              <fieldset className="flex flex-col gap-100">
                <legend className="font-designer-12b text-text-strong">
                  방 규칙
                  <span className="font-designer-11m text-text-subtlest ml-50">
                    구체적인 약속 2개 이상
                  </span>
                </legend>
                {rules.map((rule, index) => (
                  <div key={rule.id} className="flex items-center gap-75">
                    <BaseInput
                      required
                      maxLength={300}
                      value={rule.body}
                      onValueChange={(value) => updateRule(index, value)}
                      placeholder={
                        index === 0
                          ? '막힌 지점은 3줄로 구체적으로 묻기'
                          : '작업물은 링크나 화면과 함께 보여주기'
                      }
                    />
                    {rules.length > 2 && (
                      <Button
                        type="button"
                        color="outlined"
                        size="small"
                        onClick={() =>
                          setRules((current) =>
                            current.filter((item) => item.id !== rule.id),
                          )
                        }
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                ))}
                {rules.length < 5 && (
                  <Button
                    type="button"
                    color="outlined"
                    size="small"
                    className="self-start"
                    onClick={() =>
                      setRules((current) => [
                        ...current,
                        {
                          id: `rule-${Date.now()}`,
                          body: '',
                        },
                      ])
                    }
                  >
                    규칙 추가
                  </Button>
                )}
                <p className="font-designer-11r text-text-subtlest">
                  예시 두 줄을 미리 채워 두었어요. 그대로 두거나 방에 맞게
                  고쳐도 됩니다.
                </p>
              </fieldset>
              <Field
                label="내 소개"
                hint="방장으로 처음 올라가는 소개"
                htmlFor="community-room-create-owner-introduction"
              >
                <TextAreaInput
                  id="community-room-create-owner-introduction"
                  value={ownerIntroduction}
                  maxLength={500}
                  onChange={(event) => setOwnerIntroduction(event.target.value)}
                  placeholder="방을 만든 이유와 지금의 목표를 알려주세요."
                  className="h-1000"
                />
              </Field>
              <Field
                label="첫 글 제목"
                hint="방 맨 위에 고정됩니다"
                htmlFor="community-room-create-first-post-title"
              >
                <BaseInput
                  id="community-room-create-first-post-title"
                  required
                  minLength={2}
                  maxLength={120}
                  value={firstPostTitle}
                  onValueChange={setFirstPostTitle}
                  placeholder="예: 이 방을 시작하며"
                />
              </Field>
              <Field
                label="첫 글 본문"
                hint="세 줄이면 충분해요"
                htmlFor="community-room-create-first-post-body"
              >
                <div>
                  <p className="font-designer-11r text-text-subtle mb-75">
                    뭘 쓸지 모르겠으면 눌러서 시작하세요.
                  </p>
                  <div className="flex flex-wrap gap-75">
                    {FIRST_POST_SEEDS.map(([label, seed]) => (
                      <Button
                        key={label}
                        type="button"
                        color="outlined"
                        size="small"
                        onClick={() => setFirstPostBody(seed)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <TextAreaInput
                  id="community-room-create-first-post-body"
                  value={firstPostBody}
                  maxLength={5000}
                  onChange={(event) => setFirstPostBody(event.target.value)}
                  placeholder="세 줄이면 충분해요"
                  className="h-1600"
                />
                <p className="font-designer-11r text-text-subtlest leading-relaxed">
                  방을 열면 사람들이 제일 먼저 보는 글이에요. 첫 글만 남기면
                  열려요.
                </p>
              </Field>
              <p className="font-designer-12m text-text-success">
                쓰던 내용은 자동으로 저장돼요. 닫았다가 다시 와도 그대로예요.
              </p>
              {submitError && (
                <p role="alert" className="font-designer-13m text-text-error">
                  {submitError}
                </p>
              )}
            </form>
          </Modal.Body>
          <Modal.Footer variant="form" className="px-300 py-200">
            <Modal.Close asChild>
              <Button color="outlined" size="medium">
                취소
              </Button>
            </Modal.Close>
            <Button
              form={FORM_ID}
              type="submit"
              color="primary"
              size="medium"
              disabled={createMutation.isPending || !canSubmit}
              data-testid="community-room-create-submit"
            >
              {createMutation.isPending
                ? '방 여는 중'
                : remainingFieldCount > 0
                  ? `아직 ${remainingFieldCount}칸 남았어요`
                  : !hasAllAxisTags
                    ? '방의 조건을 골라 주세요'
                    : '방 열고 들어가기'}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
