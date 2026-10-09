'use client';

import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import AdminCourseField from '@/components/admin/courses/admin-course-field';
import AdminCourseThumbnailField from '@/components/admin/courses/admin-course-thumbnail-field';
import Button from '@/components/common/ui/button';
import ChipButton from '@/components/common/ui/chip/chip-button';
import { BaseInput, NativeSelect } from '@/components/common/ui/input';
import BorderedTextarea from '@/components/common/ui/input/bordered-textarea';
import { CLASS_INPUT_LIMITS } from '@/features/admin/course-management/model/admin-class-input-policy';
import type {
  AdminCourseFormValues,
  AdminCourseStatus,
} from '@/features/admin/course-management/model/admin-course-management-contract';
import {
  parseAdminCourseCardTags,
  serializeAdminCourseCardTags,
} from '@/features/admin/course-management/model/admin-course-tag-utils';

interface AdminCourseFormContentProps {
  courseForm: AdminCourseFormValues;
  courseThumbnailFileName?: string;
  courseThumbnailHasFile: boolean;
  courseThumbnailPreviewUrl?: string;
  courseThumbnailStatusText: string;
  courseThumbnailDisplayWidth: number;
  handleChangeCourseThumbnail: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearCourseThumbnailSelection: () => void;
  isCourseFormLocked: boolean;
  onChangeCourseThumbnailDisplayWidth: (width: number) => void;
  statusOptions: Array<{ value: AdminCourseStatus; label: string }>;
  thumbnailAccept: string;
  updateCourseFormField: <K extends keyof AdminCourseFormValues>(
    key: K,
    value: AdminCourseFormValues[K],
  ) => void;
  toDateTimeLocal?: (value?: string) => string;
  toKstOffsetDateTime?: (value: string) => string | undefined;
}

export function AdminCourseFormContent({
  courseForm,
  courseThumbnailFileName,
  courseThumbnailHasFile,
  courseThumbnailPreviewUrl,
  courseThumbnailStatusText,
  courseThumbnailDisplayWidth,
  handleChangeCourseThumbnail,
  handleClearCourseThumbnailSelection,
  isCourseFormLocked,
  onChangeCourseThumbnailDisplayWidth,
  statusOptions,
  thumbnailAccept,
  updateCourseFormField,
}: AdminCourseFormContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-150">
        <AdminCourseField
          label="Slug"
          helper="필수 · 최대 100자 · 영소문자/숫자/하이픈만 허용 · 형식: class-intro"
        >
          <BaseInput
            size="m"
            disabled={isCourseFormLocked}
            value={courseForm.slug}
            placeholder="class-v0-6"
            maxLength={CLASS_INPUT_LIMITS.course.slugMax}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            onValueChange={(slug) => updateCourseFormField('slug', slug)}
          />
        </AdminCourseField>
        <AdminCourseField
          label="상태"
          helper="필수 · 공개/오픈 예정/비공개 중 선택"
        >
          <NativeSelect
            disabled={isCourseFormLocked}
            value={courseForm.status}
            onChange={(event) =>
              updateCourseFormField(
                'status',
                event.target.value as AdminCourseStatus,
              )
            }
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </AdminCourseField>
        <AdminCourseField label="제목" helper="필수 · trim 저장 · 최대 150자">
          <BaseInput
            size="m"
            disabled={isCourseFormLocked}
            value={courseForm.title}
            placeholder="제로원 클래스"
            maxLength={CLASS_INPUT_LIMITS.course.titleMax}
            onValueChange={(title) => updateCourseFormField('title', title)}
          />
        </AdminCourseField>
        <AdminCourseField
          label="카드 헤드라인"
          helper="선택 · trim 저장 · 최대 200자"
        >
          <BaseInput
            size="m"
            disabled={isCourseFormLocked}
            value={courseForm.cardHeadline}
            placeholder="퇴근 후 바로 만드는 바이브 코딩"
            maxLength={CLASS_INPUT_LIMITS.course.cardHeadlineMax}
            onValueChange={(cardHeadline) =>
              updateCourseFormField('cardHeadline', cardHeadline)
            }
          />
        </AdminCourseField>
        <AdminCourseField
          label="카드 요약"
          helper="선택 · trim 저장 · 최대 200자"
        >
          <BaseInput
            size="m"
            disabled={isCourseFormLocked}
            value={courseForm.cardSummary}
            placeholder="5일 동안 MVP를 완성하는 실전형 클래스"
            maxLength={CLASS_INPUT_LIMITS.course.cardSummaryMax}
            onValueChange={(cardSummary) =>
              updateCourseFormField('cardSummary', cardSummary)
            }
          />
        </AdminCourseField>
        <AdminCourseField
          label="기간(일)"
          helper="선택 · 1 이상의 정수 · 생성 시 미입력하면 기본 5일"
        >
          <BaseInput
            size="m"
            type="number"
            min={1}
            step={1}
            disabled={isCourseFormLocked}
            value={courseForm.durationDays}
            placeholder="5"
            onValueChange={(durationDays) =>
              updateCourseFormField('durationDays', durationDays)
            }
          />
        </AdminCourseField>
      </div>
      <div className="mt-150 flex flex-col gap-150">
        <AdminCourseField
          label="썸네일 이미지"
          helper="선택 · 저장 URL은 최대 500자 · http/https URL만 허용 · 파일 첨부 시 저장 때 자동 업로드됩니다."
        >
          <AdminCourseThumbnailField
            accept={thumbnailAccept}
            canClear={courseThumbnailHasFile}
            fileName={courseThumbnailFileName}
            isUploading={isCourseFormLocked}
            previewUrl={courseThumbnailPreviewUrl}
            statusText={courseThumbnailStatusText}
            width={courseThumbnailDisplayWidth}
            onChange={handleChangeCourseThumbnail}
            onChangeWidth={onChangeCourseThumbnailDisplayWidth}
            onClear={handleClearCourseThumbnailSelection}
          />
        </AdminCourseField>
        <AdminCourseField
          label="카드 태그"
          helper="선택 · 최대 10개 · 각 태그 최대 30자 · trim 저장"
        >
          <AdminCourseTagChipInput
            disabled={isCourseFormLocked}
            value={courseForm.cardTags}
            onChange={(cardTags) => updateCourseFormField('cardTags', cardTags)}
          />
        </AdminCourseField>
        <AdminCourseField
          label="설명"
          helper="선택 · trim 저장 · 최대 2000자 · 공백 저장 허용"
        >
          <BorderedTextarea
            disabled={isCourseFormLocked}
            value={courseForm.description}
            placeholder="공개 상세 화면에 노출될 클래스 소개를 입력하세요."
            maxLength={CLASS_INPUT_LIMITS.course.descriptionMax}
            onChange={(event) =>
              updateCourseFormField('description', event.target.value)
            }
          />
        </AdminCourseField>
        <AdminCourseField
          label="수강생 알림톡 발송"
          helper="끄면 이 코스 수강생에게 보내는 일일 학습 리마인더 등 카카오톡 알림톡(스케줄 발송)이 중단됩니다. 결제·완주 같은 거래성 알림은 영향받지 않습니다."
        >
          <label className="flex cursor-pointer items-center gap-100">
            <input
              type="checkbox"
              disabled={isCourseFormLocked}
              checked={courseForm.reminderAlerttalkEnabled}
              onChange={(event) =>
                updateCourseFormField(
                  'reminderAlerttalkEnabled',
                  event.target.checked,
                )
              }
              className="size-300 rounded-50 accent-rose-500"
            />
            <span className="font-designer-14m text-text-default">
              {courseForm.reminderAlerttalkEnabled
                ? '발송 켜짐 — 수강생에게 알림톡을 보냅니다'
                : '발송 꺼짐 — 수강생에게 알림톡을 보내지 않습니다'}
            </span>
          </label>
        </AdminCourseField>
      </div>
    </>
  );
}

function AdminCourseTagChipInput({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draftTag, setDraftTag] = useState('');
  const tags = parseAdminCourseCardTags(value);

  const commitTags = (nextValues: string[]) => {
    const normalizedTags = parseAdminCourseCardTags(
      [...tags, ...nextValues].join(', '),
    ).slice(0, CLASS_INPUT_LIMITS.course.cardTagMaxCount);

    onChange(serializeAdminCourseCardTags(normalizedTags));
  };

  const commitDraftTag = () => {
    const nextTags = parseAdminCourseCardTags(draftTag);
    if (nextTags.length === 0) return;
    commitTags(nextTags);
    setDraftTag('');
  };

  const removeTag = (targetTag: string) => {
    onChange(
      serializeAdminCourseCardTags(tags.filter((tag) => tag !== targetTag)),
    );
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;

    event.preventDefault();
    commitDraftTag();
  };

  return (
    <div className="flex flex-col gap-100">
      <BaseInput
        size="m"
        disabled={disabled}
        value={draftTag}
        placeholder="태그를 입력하고 Enter를 눌러 추가하세요"
        maxLength={CLASS_INPUT_LIMITS.course.cardTagMaxLength}
        onKeyDown={handleTagKeyDown}
        onValueChange={(nextValue) => setDraftTag(nextValue)}
        onPaste={(event) => {
          const pastedText = event.clipboardData.getData('text');
          const pastedTags = parseAdminCourseCardTags(pastedText);
          if (pastedTags.length <= 1) return;

          event.preventDefault();
          commitTags(pastedTags);
        }}
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-75">
          {tags.map((tag) => (
            <ChipButton
              key={tag}
              type="button"
              variant="preset"
              disabled={disabled}
              className="border-border-default bg-background-default text-text-default font-designer-13m rounded-full border px-125 py-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => removeTag(tag)}
            >
              {tag} ×
            </ChipButton>
          ))}
        </div>
      ) : (
        <p className="font-designer-13r text-text-subtlest">
          아직 추가된 태그가 없습니다.
        </p>
      )}
      <p className="font-designer-13r text-text-subtle">
        {tags.length}/{CLASS_INPUT_LIMITS.course.cardTagMaxCount}개 · 태그당
        최대 {CLASS_INPUT_LIMITS.course.cardTagMaxLength}자
      </p>
    </div>
  );
}

interface AdminCourseCompletionMessageContentProps {
  completionMessage: string;
  completionMessageHydrating: boolean;
  completionMessageUpdatedAt?: string;
  effectiveCourseId?: number;
  formatDateTime: (value?: string) => string;
  onChangeCompletionMessage: (value: string) => void;
  onSaveCompletionMessage: () => void;
  upsertCompletionMessagePending: boolean;
}

export function AdminCourseCompletionMessageContent({
  completionMessage,
  completionMessageHydrating,
  completionMessageUpdatedAt,
  effectiveCourseId,
  formatDateTime,
  onChangeCompletionMessage,
  onSaveCompletionMessage,
  upsertCompletionMessagePending,
}: AdminCourseCompletionMessageContentProps) {
  return (
    <>
      <BorderedTextarea
        disabled={completionMessageHydrating || upsertCompletionMessagePending}
        value={completionMessage}
        placeholder="완주를 축하합니다! 다음 단계로 이어갈 수 있도록 안내 메시지를 입력하세요."
        maxLength={CLASS_INPUT_LIMITS.course.completionMessageMax}
        onChange={(event) => onChangeCompletionMessage(event.target.value)}
      />
      <p className="font-designer-13r text-text-subtle mt-75">
        선택 입력 · 저장 시 trim 적용 · 공백만 입력 불가 · 최대 200자 · 현재{' '}
        {completionMessage.length}/200자
      </p>
      <div className="mt-150 flex items-center justify-between gap-100">
        <span className="font-designer-13r text-text-subtlest">
          {completionMessageHydrating
            ? '완주 메시지를 불러오는 중입니다.'
            : `마지막 저장: ${formatDateTime(completionMessageUpdatedAt)}`}
        </span>
        <Button
          size="small"
          disabled={
            !effectiveCourseId ||
            completionMessageHydrating ||
            upsertCompletionMessagePending
          }
          loading={upsertCompletionMessagePending}
          onClick={onSaveCompletionMessage}
        >
          메시지 저장
        </Button>
      </div>
    </>
  );
}
