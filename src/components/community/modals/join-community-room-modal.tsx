'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { House, Users } from 'lucide-react';
import Image from 'next/image';
import { type ReactNode, useMemo, useState } from 'react';
import Button from '@/components/common/ui/button';
import TextAreaInput from '@/components/common/ui/input/text-area';
import { Modal } from '@/components/common/ui/modal';
import { SelectableCard } from '@/components/common/ui/selectable-card';
import TextActionButton from '@/components/common/ui/text-action-button';
import CommunityAuthorNameTrigger from '@/features/community/ui/community-author-name-trigger';
import { useJoinCommunityRoomMutation } from '@/hooks/queries/community/use-community-room-hub-query';
import type { CommunityRoomSummary } from '@/types/community/room-hub';

const DEFAULT_ADMISSION_QUESTION = {
  order: 1,
  body: '지금 뭘 만들고 있나요?',
};

const getRoomIcon = (room: CommunityRoomSummary) => {
  const roomText =
    `${room.slug} ${room.code} ${room.name} ${room.description}`.toLowerCase();

  if (/자동|automation|office|excel/.test(roomText)) {
    return '/community/rooms/icons/room-auto.jpg';
  }
  if (/배포|deploy|launch|server/.test(roomText)) {
    return '/community/rooms/icons/room-deploy.jpg';
  }
  if (/취업|포트폴리오|portfolio|resume/.test(roomText)) {
    return '/community/rooms/icons/room-portfolio.jpg';
  }

  return '/community/rooms/icons/room-web.jpg';
};

export default function JoinCommunityRoomModal({
  activeRoomCount,
  activeRoomLimit,
  activeRooms,
  onJoined,
  room,
  trigger,
}: {
  activeRoomCount: number;
  activeRoomLimit: number;
  activeRooms: CommunityRoomSummary[];
  onJoined: () => void;
  room: CommunityRoomSummary;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [leaveRoomId, setLeaveRoomId] = useState<number>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const joinMutation = useJoinCommunityRoomMutation();
  const needsSwap = activeRoomCount >= activeRoomLimit;
  const admissionQuestions = useMemo(
    () =>
      (room.admissionQuestions?.length
        ? room.admissionQuestions
        : [DEFAULT_ADMISSION_QUESTION]
      )
        .slice()
        .sort((left, right) => left.order - right.order)
        .slice(0, 3),
    [room.admissionQuestions],
  );
  const allAnswersReady = admissionQuestions.every(
    (question) => answers[question.order]?.trim().length,
  );
  const roomOwner = room.members?.items.find(
    (member) =>
      member.publicProfileUuid === room.ownership?.ownerPublicProfileUuid,
  );

  const reset = () => {
    setAnswers({});
    setLeaveRoomId(undefined);
    setErrorMessage(undefined);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !joinMutation.isPending) reset();
  };

  const handleJoin = async () => {
    setErrorMessage(undefined);
    if (!allAnswersReady) {
      setErrorMessage('방장이 남긴 질문에 답해 주세요.');
      return;
    }
    if (needsSwap && !leaveRoomId) {
      setErrorMessage('바꿀 방을 먼저 골라 주세요.');
      return;
    }

    try {
      const result = await joinMutation.mutateAsync({
        roomId: room.roomId,
        introduction: admissionQuestions
          .map((question) => answers[question.order].trim())
          .join('\n\n'),
        leaveRoomId,
      });
      if (result.joined) {
        sendGTMEvent({
          event: 'room_join',
          room_id: room.roomId,
          room_name: room.name,
        });
      }
      setOpen(false);
      reset();
      onJoined();
    } catch {
      setErrorMessage(
        needsSwap
          ? '방을 바꾸지 못했어요. 방 상태를 새로 확인한 뒤 다시 골라 주세요.'
          : '방에 정착하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Trigger asChild>{trigger}</Modal.Trigger>
      <Modal.Portal>
        <Modal.Overlay className="opacity-60" />
        <Modal.Content
          description={`${room.name} 방에 정착하기`}
          className="max-w-xl rounded-250"
        >
          <Modal.Header variant="form" className="px-250 pt-250 pb-175">
            <div className="min-w-0">
              <Modal.Title>{room.name} 방에 정착하기</Modal.Title>
              <p className="font-designer-12m text-text-subtle mt-50">
                질문마다 60자면 충분해요.
              </p>
            </div>
            <Modal.CloseButton aria-label="닫기" className="size-550" />
          </Modal.Header>

          <Modal.Body variant="form" className="gap-200 px-250 py-200">
            <section className="border-border-brand bg-background-accent-rose-subtle rounded-200 flex items-center gap-125 border p-150">
              {roomOwner ? (
                <CommunityAuthorNameTrigger
                  publicProfileUuid={roomOwner.publicProfileUuid}
                  name={roomOwner.nickname}
                  image={roomOwner.profileImageUrl ?? undefined}
                  imageSize={38}
                  onNavigate={() => handleOpenChange(false)}
                  className="font-designer-14b text-text-strong"
                />
              ) : (
                <span className="bg-fill-brand-default-default text-text-inverse flex size-475 shrink-0 items-center justify-center rounded-full">
                  <House className="size-200" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-designer-14b text-text-strong">
                  {roomOwner ? '방장이 남긴 질문' : '이 방의 방장'}
                </h2>
                <p className="font-designer-12r text-text-subtle mt-25">
                  {room.admissionQuestions?.length
                    ? `아래 ${admissionQuestions.length}가지는 ${roomOwner ? `${roomOwner.nickname}님이` : '방장이'} 직접 쓴 질문이에요. 각 60자면 충분해요.`
                    : '정착 전에 한 가지만 알려 주세요. 답은 정착 인사로 남아요.'}
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-175">
              {admissionQuestions.map((question) => {
                const answer = answers[question.order] ?? '';
                const inputId = `community-room-join-answer-${question.order}`;

                return (
                  <label
                    key={question.order}
                    htmlFor={inputId}
                    className="flex flex-col gap-75"
                  >
                    <span className="font-designer-13b text-text-strong">
                      {question.body}
                    </span>
                    <TextAreaInput
                      id={inputId}
                      value={answer}
                      maxLength={60}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.order]: event.target.value,
                        }))
                      }
                      placeholder="예: 동네 공방 예약 페이지를 만드는 중이에요"
                      className="h-800"
                    />
                    <span className="font-designer-11m text-text-subtlest text-right tabular-nums">
                      {answer.length} / 60
                    </span>
                  </label>
                );
              })}
            </div>

            {needsSwap && (
              <section data-testid="community-room-swap-list">
                <h2 className="font-designer-15b text-text-strong">
                  방은 {activeRoomLimit}개까지예요. 하나를 바꿀까요?
                </h2>
                <p className="font-designer-12r text-text-subtle mt-50">
                  바꾸려는 방을 고르면 그 방에서 나가고 새 방에 정착해요.
                </p>
                <SelectableCard.Group
                  className="mt-125 flex flex-col gap-100"
                  label="교체할 방"
                  value={
                    leaveRoomId === undefined ? undefined : String(leaveRoomId)
                  }
                  onValueChange={(value) => setLeaveRoomId(Number(value))}
                >
                  {activeRooms.map((activeRoom) => {
                    const selected = leaveRoomId === activeRoom.roomId;
                    const quiet = activeRoom.stats.postCount7d === 0;

                    return (
                      <SelectableCard.Item
                        key={activeRoom.roomId}
                        value={String(activeRoom.roomId)}
                        data-testid={`community-room-swap-${activeRoom.roomId}`}
                        className="flex-row items-center gap-125 p-150 md:p-150"
                      >
                        <Image
                          src={getRoomIcon(activeRoom)}
                          width={46}
                          height={46}
                          alt=""
                          className="size-575 shrink-0 rounded-150 object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <strong className="font-designer-14b text-text-strong block truncate">
                            {activeRoom.name}
                          </strong>
                          <span className="font-designer-11m text-text-subtle mt-25 block">
                            최근 7일 글 {activeRoom.stats.postCount7d}개 · 오늘
                            새 글 {activeRoom.newPostsToday}개
                          </span>
                        </span>
                        {quiet && !selected && (
                          <span className="font-designer-10b bg-background-accent-gray-subtle text-text-subtle rounded-full px-100 py-50">
                            바꾸기 좋음
                          </span>
                        )}
                      </SelectableCard.Item>
                    );
                  })}
                </SelectableCard.Group>
                <div className="border-border-brand bg-background-default rounded-150 mt-125 border border-l-4 p-150">
                  <h3 className="font-designer-13b text-text-strong">
                    고른 방에서 나가면 이렇게 됩니다
                  </h3>
                  <p className="font-designer-12r text-text-subtle mt-50 leading-relaxed">
                    내가 쓴 글과 답은 그 방에 그대로 남아요. 대신 그 방의 답변과
                    댓글은 다시 가려지고, 새 글은 쓸 수 없어요.
                  </p>
                </div>
              </section>
            )}

            {errorMessage && (
              <p role="alert" className="font-designer-13m text-text-error">
                {errorMessage}
              </p>
            )}
          </Modal.Body>

          <Modal.Footer
            variant="form"
            className="flex-col gap-75 px-250 py-175"
          >
            <Button
              color="primary"
              size="medium"
              className="w-full"
              icon={<Users />}
              disabled={
                joinMutation.isPending ||
                !allAnswersReady ||
                (needsSwap && !leaveRoomId)
              }
              data-testid="community-room-join-submit"
              onClick={handleJoin}
            >
              {joinMutation.isPending
                ? '정착하는 중'
                : needsSwap && !leaveRoomId
                  ? '바꿀 방을 먼저 골라 주세요'
                  : '이 방에 정착하기'}
            </Button>
            <Modal.Close asChild>
              <TextActionButton
                type="button"
                tone="subtle"
                weight="bold"
                className="font-designer-13b text-text-subtle min-h-500 border-0 px-100 py-0 underline underline-offset-4"
              >
                나중에
              </TextActionButton>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
