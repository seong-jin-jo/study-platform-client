'use client';

import Button from '@/components/common/ui/button';

interface PaymentExitConfirmModalProps {
  open: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export function PaymentExitConfirmModal({
  open,
  onContinue,
  onExit,
}: PaymentExitConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-600">
      <div className="w-full max-w-8875 rounded-200 bg-background-default p-600">
        <h2 className="font-designer-20b text-gray-800">
          결제를 중단하시겠어요?
        </h2>
        <p className="mt-150 font-designer-16r text-gray-800">
          지금 페이지를 떠나면 입력하신 내용이 사라지고 결제가 진행되지 않아요.
        </p>
        <div className="mt-400 flex gap-200">
          <Button
            type="button"
            onClick={onContinue}
            color="outlined"
            size="large"
            className="h-700 flex-1 border-background-brand-default font-designer-16b text-text-brand"
          >
            계속 결제하기
          </Button>
          <Button
            type="button"
            onClick={onExit}
            color="primary"
            size="large"
            className="h-700 flex-1 font-designer-16b"
          >
            결제 중단하기
          </Button>
        </div>
      </div>
    </div>
  );
}
