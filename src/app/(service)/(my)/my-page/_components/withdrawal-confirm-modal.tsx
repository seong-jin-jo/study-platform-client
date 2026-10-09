'use client';

import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Modal } from '@/components/common/ui/modal';
import { useWithdrawMemberMutation } from '@/hooks/queries/user/use-withdraw-member-mutation';

interface WithdrawalConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WithdrawalConfirmModal({
  open,
  onOpenChange,
}: WithdrawalConfirmModalProps) {
  const { mutate: withdraw, isPending } = useWithdrawMemberMutation();

  const handleConfirm = () => {
    withdraw();
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content size="medium">
          <Modal.Header className={cn('border-none', 'text-left')}>
            <Modal.Title className="font-designer-24b">
              탈퇴 전, 안내 사항
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <ol className="flex flex-col gap-100 text-left">
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  1.
                </span>
                <span className="font-designer-18r text-text-default">
                  탈퇴하기 클릭 시,{' '}
                  <span className="font-designer-18b text-text-brand">
                    ZERO-ONE 서비스에서 탈퇴 처리
                  </span>{' '}
                  됩니다.
                </span>
              </li>
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  2.
                </span>
                <span className="font-designer-18r text-text-default">
                  프로필, 연락처, 소셜 로그인 식별자는 삭제 또는 비식별화되며
                  복구할 수 없습니다.
                </span>
              </li>
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  3.
                </span>
                <span className="font-designer-18r text-text-default">
                  직접 작성한 콘텐츠(빌더 피드, 질문답변, 게시물, 댓글 등)는
                  자동으로 삭제되지 않으며, 작성자 표시는 탈퇴한 회원으로
                  변경됩니다.
                </span>
              </li>
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  4.
                </span>
                <span className="font-designer-18r text-text-default">
                  결제, 환불, 분쟁 대응에 필요한 기록은 관련 법령에 따라 별도
                  보관될 수 있습니다.
                </span>
              </li>
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  5.
                </span>
                <span className="font-designer-18r text-text-default">
                  같은 소셜 계정으로 다시 가입하더라도 이전 활동과 수강 권한은
                  복구되지 않습니다.
                </span>
              </li>
              <li className="flex items-start gap-125">
                <span className="font-designer-18r text-text-default shrink-0">
                  6.
                </span>
                <span className="font-designer-18r text-text-default">
                  탈퇴하기 클릭 시 위 내용에 동의하는 것으로 간주됩니다.
                </span>
              </li>
            </ol>
          </Modal.Body>

          <Modal.Footer variant="alert">
            <div className="flex w-full gap-200">
              <Button
                color="secondary"
                size="medium"
                className="flex-1"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                color="primary"
                size="medium"
                className="flex-1 bg-fill-danger-default-default hover:bg-red-600 active:bg-red-700"
                disabled={isPending}
                onClick={handleConfirm}
              >
                {isPending ? '탈퇴 중...' : '탈퇴하기'}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
