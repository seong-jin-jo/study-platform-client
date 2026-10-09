'use client';

import { ChevronLeft, FilePenLine } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import Button from '@/components/common/ui/button';
import ChipButton from '@/components/common/ui/chip/chip-button';
import FieldErrorText from '@/components/common/ui/form/field-error-text';
import FormSectionCard from '@/components/common/ui/form/form-section-card';
import { BaseInput } from '@/components/common/ui/input';
import PageContainer from '@/components/common/ui/page-container';
import ToggleButton from '@/components/common/ui/toggle/button';
import {
  type CommunityWriteMode,
  useCommunityWriteController,
} from '@/features/community/model/use-community-write-controller';
import { useCommunityRoomHubQuery } from '@/hooks/queries/community/use-community-room-hub-query';
import type { CommunityBoard } from '@/types/community/domain';
import { COMMUNITY_BOARD } from '@/types/community/domain';
import {
  COMMUNITY_WRITE_CONTENT_MAX_VISIBLE_LENGTH,
  COMMUNITY_WRITE_TITLE_MAX_LENGTH,
} from '@/types/schemas/community-write-schema';
import CommunityMarkdownEditor from '../community-markdown-editor';
import CommunitySectionShell from '../community-section-shell';

interface CommunityWritePageClientProps {
  initialBoard?: CommunityBoard;
  initialCohortId?: number;
  initialRoomId?: number;
  initialInsightReference?: {
    documentId: string;
    title: string;
    slug: string;
  };
  mode: CommunityWriteMode;
  postId?: number;
  returnPage?: number;
}

export default function CommunityWritePageClient({
  initialBoard,
  initialCohortId,
  initialRoomId,
  initialInsightReference,
  mode,
  postId,
  returnPage,
}: CommunityWritePageClientProps) {
  const { form, state, actions, viewModel } = useCommunityWriteController({
    initialBoard,
    initialCohortId,
    initialRoomId,
    initialInsightReference,
    mode,
    postId,
    returnPage,
  });
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const roomHubQuery = useCommunityRoomHubQuery(
    {},
    mode === 'create' && state.isAccessReady,
  );
  const myRooms = useMemo(
    () => roomHubQuery.data?.myRooms ?? [],
    [roomHubQuery.data?.myRooms],
  );
  const handleRoomChange = actions.handleRoomChange;

  useEffect(() => {
    if (mode === 'create' && !viewModel.selectedRoomId && myRooms[0]?.roomId) {
      handleRoomChange(myRooms[0].roomId);
    }
  }, [handleRoomChange, mode, myRooms, viewModel.selectedRoomId]);

  if (!state.isAccessReady) {
    return (
      <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
        <CommunitySectionShell className="gap-250">
          <p className="font-designer-16r text-text-subtle">
            에디터를 불러오는 중입니다.
          </p>
        </CommunitySectionShell>
      </PageContainer>
    );
  }

  if (
    mode === 'create' &&
    !roomHubQuery.isPending &&
    !roomHubQuery.isError &&
    myRooms.length === 0
  ) {
    return (
      <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
        <section className="rounded-200 border border-dashed border-border-default bg-background-default px-250 py-425 text-center">
          <h1 className="font-designer-15b text-text-strong">
            먼저 정착할 방을 고를까요
          </h1>
          <p className="mt-75 font-designer-13r leading-250 text-text-subtle">
            글은 방 안에 쌓여요. 방을 고르면 그 방 사람들이 바로 읽고 답을
            답니다.
          </p>
          <Button asChild color="primary" size="large" className="mt-200">
            <Link href="/community">방 고르러 가기</Link>
          </Button>
        </section>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
      <CommunitySectionShell className="gap-250 border-b border-border-default pb-300">
        <Link
          href={viewModel.backHref}
          className="inline-flex items-center gap-75 font-designer-14m text-text-subtle transition-colors hover:text-text-default"
        >
          <ChevronLeft className="h-200 w-200" />
          뒤로
        </Link>

        <div className="flex flex-col gap-200 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-100">
            <p className="font-designer-12m text-text-subtle">
              {viewModel.pageDescription}
            </p>
            <h1 className="font-designer-28b text-text-strong">
              {viewModel.pageTitle}
            </h1>
          </div>

          <div className="flex gap-100">
            <Button
              type="button"
              color="outlined"
              size="large"
              onClick={actions.handleCancel}
            >
              취소
            </Button>
            <Button
              type="submit"
              size="large"
              form="community-write-form"
              disabled={viewModel.isSubmitDisabled}
              loading={state.isSubmitting}
              loadingText={viewModel.submitLabel}
            >
              {viewModel.submitLabel}
            </Button>
          </div>
        </div>
      </CommunitySectionShell>

      <form
        id="community-write-form"
        onSubmit={actions.handleSubmit}
        className="flex flex-col gap-250"
      >
        {mode === 'create' ? (
          <FormSectionCard
            title="어느 방에 올릴까요"
            className="rounded-200 p-225"
            titleClassName="font-designer-13b"
          >
            {roomHubQuery.isPending ? (
              <p className="font-designer-13r text-text-subtle">
                내 방을 불러오는 중이에요.
              </p>
            ) : roomHubQuery.isError ? (
              <div className="rounded-150 border border-border-default border-l-3 border-l-border-brand p-175">
                <p className="font-designer-14b text-text-strong">
                  방 목록을 못 불러왔어요
                </p>
                <p className="mt-75 font-designer-13r text-text-subtle">
                  잠깐 문제가 생겼어요. 다시 눌러 주세요.
                </p>
                <Button
                  type="button"
                  color="outlined"
                  size="small"
                  className="mt-150"
                  onClick={() => roomHubQuery.refetch()}
                >
                  다시 시도
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-100">
                {myRooms.map((room, index) => {
                  const isSelected = room.roomId === viewModel.selectedRoomId;

                  return (
                    <ToggleButton
                      key={room.roomId}
                      size="lg"
                      variant="square"
                      pressed={isSelected}
                      onPressedChange={() =>
                        actions.handleRoomChange(room.roomId)
                      }
                      className="w-full justify-start gap-150 rounded-200 p-175 text-left transition-colors data-[state=off]:border-border-default data-[state=off]:bg-background-default data-[state=off]:text-text-default data-[state=off]:hover:border-border-strong data-[state=on]:border-border-brand data-[state=on]:bg-background-accent-rose-subtle data-[state=on]:text-text-default"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-designer-15b text-text-strong">
                          {room.name}
                        </span>
                        <span className="mt-50 block font-designer-12m text-text-subtle">
                          {index === 0
                            ? '가장 최근에 활동한 방이에요'
                            : `멤버 ${room.memberCount}명`}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="shrink-0 rounded-full bg-fill-brand-default-default px-100 py-50 font-designer-11b text-text-inverse">
                          여기에 올려요
                        </span>
                      ) : null}
                    </ToggleButton>
                  );
                })}
                {viewModel.selectedBoard !== COMMUNITY_BOARD.QNA &&
                !viewModel.selectedRoomId ? (
                  <FieldErrorText message="올릴 방을 먼저 골라 주세요." />
                ) : null}
              </div>
            )}
          </FormSectionCard>
        ) : null}

        {viewModel.insightReference && (
          <section className="rounded-200 border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-200">
            <p className="font-designer-12b font-black tracking-[0.02em] text-rose-700">
              인사이트에서 이어온 질문
            </p>
            <p className="mt-75 text-[14px] leading-[1.45] font-extrabold text-text-strong">
              {viewModel.insightReference.title}
            </p>
            <p className="mt-75 font-designer-12r leading-[1.55] text-text-subtle">
              등록하면 서버가 이 인사이트의 제목과 요약을 확인해 질문에 참조로
              붙여요.
            </p>
          </section>
        )}

        <FormSectionCard
          title={
            <span className="inline-flex items-center gap-75">
              <FilePenLine className="text-text-brand h-225 w-225" />
              게시판
            </span>
          }
        >
          <div className="flex flex-wrap gap-100">
            {viewModel.boardOptions.map((option) => (
              <ChipButton
                key={option.id}
                variant="state"
                active={option.id === viewModel.selectedBoard}
                onClick={() => actions.handleBoardChange(option.id)}
              >
                {option.label}
              </ChipButton>
            ))}
          </div>
        </FormSectionCard>

        <FormSectionCard title="제목">
          <BaseInput
            {...register('title')}
            placeholder="제목을 입력해 주세요."
            maxLength={COMMUNITY_WRITE_TITLE_MAX_LENGTH}
            hideMeta={false}
          />
          <FieldErrorText
            message={viewModel.titleError ?? errors.title?.message}
          />
        </FormSectionCard>

        <FormSectionCard
          title="내용"
          description="마크다운과 이미지 첨부를 지원합니다."
        >
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <CommunityMarkdownEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="글 내용을 작성해 주세요."
                visibleTextCounter={{
                  maxLength: COMMUNITY_WRITE_CONTENT_MAX_VISIBLE_LENGTH,
                }}
              />
            )}
          />
          <FieldErrorText
            message={viewModel.contentError ?? errors.content?.message}
          />
        </FormSectionCard>
      </form>
    </PageContainer>
  );
}
