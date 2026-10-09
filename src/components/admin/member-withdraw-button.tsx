'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/common/ui/button';
import { useWithdrawMemberByAdminMutation } from '@/hooks/queries/user/use-member-list-query';
import { useToastStore } from '@/stores/use-toast-store';
import { analyzeError } from '@/utils/error-handler';

// 회원 상세에서 계정 탈퇴를 처리한다. 되돌릴 수 없어 2단계 인앱 확인 후 실행한다.
export default function MemberWithdrawButton({
  memberId,
}: {
  memberId: number;
}) {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [confirming, setConfirming] = useState(false);
  const withdrawMutation = useWithdrawMemberByAdminMutation();

  const handleWithdraw = () => {
    withdrawMutation.mutate(memberId, {
      onSuccess: () => {
        showToast('계정 탈퇴를 처리했습니다.', 'success');
        router.push('/admin');
      },
      onError: (error) => showToast(analyzeError(error).userMessage, 'error'),
    });
  };

  if (!confirming) {
    return (
      <Button
        color="outlined"
        size="medium"
        onClick={() => setConfirming(true)}
      >
        계정 탈퇴 처리
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-150">
      <span className="font-designer-14m text-text-error">
        정말 이 회원을 탈퇴 처리할까요? 되돌릴 수 없습니다.
      </span>
      <Button
        size="medium"
        loading={withdrawMutation.isPending}
        disabled={withdrawMutation.isPending}
        onClick={handleWithdraw}
      >
        확인
      </Button>
      <Button
        color="outlined"
        size="medium"
        disabled={withdrawMutation.isPending}
        onClick={() => setConfirming(false)}
      >
        취소
      </Button>
    </div>
  );
}
