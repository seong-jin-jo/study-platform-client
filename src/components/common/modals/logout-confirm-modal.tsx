'use client';

import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Modal } from '@/components/common/ui/modal';
import { useLogoutMutation } from '@/hooks/queries/auth/use-auth-mutation';

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogoutConfirmModal({
  open,
  onOpenChange,
}: LogoutConfirmModalProps) {
  const { mutate: logout, isPending } = useLogoutMutation();

  const handleConfirm = () => {
    logout();
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content
          size="small"
          className="max-w-[calc(100%_-_3rem)] sm:max-w-2xl"
        >
          <Modal.Header
            className={cn(
              'border-none',
              'text-left',
              'px-300 pt-300 pb-200 sm:px-400 sm:pt-400 sm:pb-300',
            )}
          >
            <Modal.Title className="font-designer-20b sm:font-designer-24b">
              로그아웃 하시겠어요?
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="px-300 py-200 sm:px-400 sm:py-300">
            <p className="font-designer-16r text-left text-text-default sm:font-designer-18r">
              로그아웃하면 다시 로그인해야 ZERO-ONE 서비스를 이용할 수 있어요.
            </p>
          </Modal.Body>

          <Modal.Footer variant="alert">
            <div className="flex w-full gap-100 sm:gap-200">
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
                className="flex-1"
                disabled={isPending}
                onClick={handleConfirm}
              >
                {isPending ? '로그아웃 중...' : '로그아웃'}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
