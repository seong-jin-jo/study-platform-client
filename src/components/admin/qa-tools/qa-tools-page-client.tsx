'use client';

import { useState } from 'react';
import ConfirmDeleteModal from '@/components/common/modals/confirm-delete-modal';
import Button from '@/components/common/ui/button';
import { BaseInput, NativeSelect } from '@/components/common/ui/input';
import { useAdminCoursesQuery } from '@/features/admin/course-management/model/use-admin-course-management-query';
import { useDebounce } from '@/hooks/common/use-debounce';
import {
  useQaCourseProgressStateQuery,
  useResetQaCourseProgressMutation,
  useSeedQaCourseProgressMutation,
  useWithdrawQaMemberMutation,
} from '@/hooks/queries/admin/qa-course-seed-queries';
import { useGetMemberListQuery } from '@/hooks/queries/user/use-member-list-query';
import { useToastStore } from '@/stores/use-toast-store';
import type {
  QaCourseProgressStateResponse,
  QaCourseTargetState,
} from '@/types/api/qa-seed.types';
import { analyzeError } from '@/utils/error-handler';

const TARGET_STATE_OPTIONS: Array<{
  value: QaCourseTargetState;
  label: string;
}> = [
  { value: 'NOT_STARTED', label: '미시작 (무료 등록, 진행 0)' },
  { value: 'HALF', label: '절반 진행 (무료 등록, 공개 레슨 절반 완료)' },
  {
    value: 'FREE_ALMOST_DONE',
    label:
      '무료 완주 직전 (마지막 무료 레슨만 미완 → 회고 제출 시 무료 완주 축하)',
  },
  {
    value: 'FREE_COMPLETED',
    label: '무료 체험 완주 (무료 레슨 전부 완료·이미 완주)',
  },
  { value: 'PAID_NOT_STARTED', label: '유료 등록만 (결제됨, 진행 0)' },
  {
    value: 'PAID_ALMOST_DONE',
    label:
      '유료 완주 직전 (결제 + 마지막 레슨만 미완 → 회고 제출 시 완주 축하)',
  },
  {
    value: 'PAID_COMPLETED',
    label: '유료 완주 (결제 + 전 레슨 완료·이미 완주)',
  },
];

const VIEWER_STATUS_LABEL: Record<
  QaCourseProgressStateResponse['viewerStatus'],
  string
> = {
  ANONYMOUS: '비로그인',
  LOGIN_ONLY: '로그인만 (미수강)',
  FREE_ENROLLED: '무료 수강 중',
  PAID: '유료 수강 중',
};

const StatePreview = ({
  state,
  isLoading,
}: {
  state?: QaCourseProgressStateResponse;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <p className="font-designer-14r text-text-subtle">
        현재 상태를 불러오는 중입니다.
      </p>
    );
  }
  if (!state) {
    return (
      <p className="font-designer-14r text-text-subtle">
        코스와 회원을 모두 선택하면 현재 상태가 표시됩니다.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-x-150 gap-y-100">
      <div>
        <dt className="font-designer-12r text-text-subtle">뷰어 상태</dt>
        <dd className="font-designer-16b text-text-default mt-25">
          {VIEWER_STATUS_LABEL[state.viewerStatus]}
        </dd>
      </div>
      <div>
        <dt className="font-designer-12r text-text-subtle">결제 여부</dt>
        <dd className="font-designer-16b text-text-default mt-25">
          {state.viewerStatus === 'PAID' ? '결제됨 (유료)' : '미결제'}
        </dd>
      </div>
      <div>
        <dt className="font-designer-12r text-text-subtle">완주 기록</dt>
        <dd className="font-designer-16b text-text-default mt-25">
          {state.hasCompletionRecord ? '있음' : '없음'}
        </dd>
      </div>
      <div>
        <dt className="font-designer-12r text-text-subtle">완료 레슨</dt>
        <dd className="font-designer-16b text-text-default mt-25">
          {state.completedLessons} / {state.totalPublishedLessons}
        </dd>
      </div>
      <div>
        <dt className="font-designer-12r text-text-subtle">완료 무료 레슨</dt>
        <dd className="font-designer-16b text-text-default mt-25">
          {state.completedFreeLessons} / {state.totalPublishedFreeLessons}
        </dd>
      </div>
    </dl>
  );
};

export default function QaToolsPageClient() {
  const showToast = useToastStore((s) => s.showToast);

  const [selectedCourseId, setSelectedCourseId] = useState<
    number | undefined
  >();
  const [memberSearch, setMemberSearch] = useState('');
  const debouncedMemberSearch = useDebounce(memberSearch, 400);
  const [selectedMemberId, setSelectedMemberId] = useState<
    number | undefined
  >();
  const [targetState, setTargetState] =
    useState<QaCourseTargetState>('PAID_COMPLETED');
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);

  const coursesQuery = useAdminCoursesQuery({ page: 0, size: 100 });
  const courses = coursesQuery.data?.content ?? [];

  const membersQuery = useGetMemberListQuery({
    searchKeyword: debouncedMemberSearch || undefined,
    page: 1,
  });
  const members = membersQuery.data?.content ?? [];

  const stateQuery = useQaCourseProgressStateQuery(
    selectedCourseId,
    selectedMemberId,
  );

  const seedMutation = useSeedQaCourseProgressMutation();
  const resetMutation = useResetQaCourseProgressMutation();
  const withdrawMutation = useWithdrawQaMemberMutation();

  const selectedMember = members.find(
    (member) => member.memberId === selectedMemberId,
  );

  const canRun = !!selectedCourseId && !!selectedMemberId;
  // 회원 탈퇴는 코스와 무관하므로 회원만 선택돼도 실행 가능하다.
  const canWithdraw = !!selectedMemberId;
  const isMutating =
    seedMutation.isPending ||
    resetMutation.isPending ||
    withdrawMutation.isPending;

  const handleSeed = () => {
    if (!selectedCourseId || !selectedMemberId) return;
    seedMutation.mutate(
      { courseId: selectedCourseId, memberId: selectedMemberId, targetState },
      {
        onSuccess: () => showToast('시드를 적용했습니다.', 'success'),
        onError: (error) => showToast(analyzeError(error).userMessage, 'error'),
      },
    );
  };

  const handleReset = () => {
    if (!selectedCourseId || !selectedMemberId) return;
    resetMutation.mutate(
      { courseId: selectedCourseId, memberId: selectedMemberId },
      {
        onSuccess: () => showToast('상태를 리셋했습니다.', 'success'),
        onError: (error) => showToast(analyzeError(error).userMessage, 'error'),
      },
    );
  };

  const handleWithdraw = () => {
    if (!selectedMemberId) return;
    withdrawMutation.mutate(
      { memberId: selectedMemberId },
      {
        onSuccess: () => {
          showToast('회원을 탈퇴 처리했습니다.', 'success');
          // 탈퇴한 회원은 목록에서 사라지므로 선택/검색 상태를 초기화한다.
          setSelectedMemberId(undefined);
          setMemberSearch('');
        },
        onError: (error) => showToast(analyzeError(error).userMessage, 'error'),
        onSettled: () => setIsWithdrawConfirmOpen(false),
      },
    );
  };

  return (
    <main className="flex flex-col gap-200 p-200">
      <header>
        <h1 className="font-designer-24b text-text-default">QA 시드 도구</h1>
        <p className="font-designer-14r text-text-subtle mt-75">
          DEV/스테이징 전용. 선택한 회원의 코스 수강 상태를 DB에 직접 세팅해
          완주 페이지 등 특정 상태에 즉시 도달합니다. 운영(prod)에서는 제공되지
          않습니다.
        </p>
        <p className="font-designer-13m text-text-error mt-75">
          실행 시 선택 회원의 이 코스 학습 산출물(진행/완주 기록, 돌아보기,
          질문/답변, 빌더피드, 완주 후 입력값)을 먼저 삭제하고 목표 상태로 다시
          만듭니다.
        </p>
        <p className="font-designer-13m text-text-error mt-75">
          회원 탈퇴는 코스와 무관하게 선택 회원을 실제 계정 탈퇴(익명화)
          처리하며, 되돌릴 수 없습니다.
        </p>
      </header>

      <section className="border-border-default bg-background-default rounded-150 flex flex-col gap-150 border p-200">
        <div className="flex flex-col gap-50">
          <span className="font-designer-13m text-text-subtle">코스</span>
          <NativeSelect
            aria-label="코스 선택"
            value={selectedCourseId ?? ''}
            disabled={coursesQuery.isLoading}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedCourseId(value === '' ? undefined : Number(value));
            }}
          >
            <option value="">
              {coursesQuery.isLoading
                ? '코스 불러오는 중…'
                : '코스를 선택하세요'}
            </option>
            {courses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.title} (#{course.courseId})
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-50">
          <span className="font-designer-13m text-text-subtle">회원 검색</span>
          <BaseInput
            size="m"
            value={memberSearch}
            placeholder="닉네임 / 이름으로 검색"
            onValueChange={(value) => {
              setMemberSearch(value);
              setSelectedMemberId(undefined);
            }}
          />
          <NativeSelect
            aria-label="회원 선택"
            className="mt-50"
            value={selectedMemberId ?? ''}
            disabled={membersQuery.isLoading}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedMemberId(value === '' ? undefined : Number(value));
            }}
          >
            <option value="">
              {membersQuery.isLoading
                ? '회원 불러오는 중…'
                : members.length === 0
                  ? '검색 결과가 없습니다'
                  : '회원을 선택하세요'}
            </option>
            {members.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.memberNickname ?? '닉네임 없음'} · {member.memberName}{' '}
                (#{member.memberId})
              </option>
            ))}
          </NativeSelect>
          {selectedMember && (
            <span className="font-designer-12r text-text-subtlest">
              선택됨:{' '}
              {selectedMember.memberNickname ?? selectedMember.memberName} (#
              {selectedMember.memberId})
            </span>
          )}
        </div>

        <div className="flex flex-col gap-50">
          <span className="font-designer-13m text-text-subtle">목표 상태</span>
          <NativeSelect
            aria-label="목표 상태 선택"
            value={targetState}
            onChange={(event) =>
              setTargetState(event.target.value as QaCourseTargetState)
            }
          >
            {TARGET_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <span className="font-designer-12r text-text-subtle">
            시드 결과는 기존 산출물을 보존하지 않습니다. 같은 회원/코스를 다시
            쓰려면 필요한 상태로 다시 시드하세요.
          </span>
        </div>
      </section>

      <section className="border-border-default bg-background-default rounded-150 flex flex-col gap-150 border p-200">
        <h2 className="font-designer-18b text-text-default">현재 상태</h2>
        <StatePreview
          state={stateQuery.data}
          isLoading={canRun && stateQuery.isLoading}
        />
      </section>

      <div className="flex flex-wrap gap-100">
        <Button
          size="medium"
          disabled={!canRun || isMutating}
          loading={seedMutation.isPending}
          onClick={handleSeed}
        >
          산출물 삭제 후 시드 실행
        </Button>
        <Button
          color="outlined"
          size="medium"
          disabled={!canRun || isMutating}
          loading={resetMutation.isPending}
          onClick={handleReset}
        >
          리셋
        </Button>
        <Button
          size="medium"
          className="bg-fill-danger-default-default text-text-inverse hover:opacity-90 active:opacity-80"
          disabled={!canWithdraw || isMutating}
          loading={withdrawMutation.isPending}
          onClick={() => setIsWithdrawConfirmOpen(true)}
        >
          회원 탈퇴
        </Button>
      </div>

      <ConfirmDeleteModal
        open={isWithdrawConfirmOpen}
        onOpenChange={setIsWithdrawConfirmOpen}
        title="회원 탈퇴 처리"
        confirmText="탈퇴 처리"
        isPending={withdrawMutation.isPending}
        onConfirm={handleWithdraw}
        content={
          <span>
            {selectedMember
              ? `${selectedMember.memberNickname ?? selectedMember.memberName} (#${selectedMember.memberId})`
              : '선택한 회원'}{' '}
            님을 실제 계정 탈퇴(익명화) 처리합니다. 코스 수강 상태와 무관하게
            계정이 비활성화되며, 이 작업은 되돌릴 수 없습니다.
          </span>
        }
      />
    </main>
  );
}
