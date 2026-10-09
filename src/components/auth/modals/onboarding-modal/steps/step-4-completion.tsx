'use client';

import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signUp } from '@/api/endpoints/auth/auth';
import Button from '@/components/common/ui/button';
import { writeAccessTokenSession } from '@/features/auth/model/client-auth-session';
import { useUploadProfileImageMutation } from '@/hooks/queries/auth/use-auth-mutation';
import { useOnboardingStore } from '@/stores/use-onboarding-store';
import { useToastStore } from '@/stores/use-toast-store';
import type { SignUpRequest } from '@/types/api/auth.types';
import { resolveCompletionRecommendation } from '../completion-recommendation';

interface Step4Data {
  nickname: string;
  profileImageFile?: File;
  job?: string;
  career?: string;
  goals: string[];
  goalEtcText?: string;
}

interface Step4CompletionProps {
  data: Step4Data;
  onSubmittingChange: (v: boolean) => void;
}

function getImageExtension(file: File): SignUpRequest['imageExtension'] {
  if (file.type === 'image/png') return 'PNG';
  if (file.type === 'image/gif') return 'GIF';
  if (file.type === 'image/webp') return 'WEBP';
  return 'JPG';
}

function buildGoalString(goals: string[], etcText?: string): string {
  return goals
    .map((g) => (g === '기타' && etcText?.trim() ? etcText.trim() : g))
    .join(', ');
}

export function Step4Completion({
  data,
  onSubmittingChange,
}: Step4CompletionProps) {
  const router = useRouter();
  const { close } = useOnboardingStore();
  const { mutate: submitSignUp, isPending } = useMutation({
    mutationFn: signUp,
  });
  const { mutateAsync: uploadImage } = useUploadProfileImageMutation();

  const recommendation = resolveCompletionRecommendation(data.goals);

  const handleFinish = () => {
    const request: SignUpRequest = {
      nickname: data.nickname,
      ...(data.profileImageFile
        ? { imageExtension: getImageExtension(data.profileImageFile) }
        : {}),
      ...(data.job ? { jobs: [data.job] } : {}),
      ...(data.career ? { career: data.career } : {}),
      ...(data.goals.length > 0
        ? { goal: buildGoalString(data.goals, data.goalEtcText) }
        : {}),
    };

    onSubmittingChange(true);
    submitSignUp(request, {
      onSuccess: async (response) => {
        const newToken = response?.content?.accessToken;
        if (newToken) writeAccessTokenSession(newToken);
        const uploadUrl = response?.content?.uploadUrl;
        try {
          if (uploadUrl && data.profileImageFile) {
            const formData = new FormData();
            formData.append('file', data.profileImageFile);
            await uploadImage({ uploadUrl, file: formData });
          }
        } catch {
          useToastStore
            .getState()
            .showToast('프로필 이미지 업로드에 실패했어요.', 'error');
        } finally {
          onSubmittingChange(false);
          close();
          router.push(recommendation.href);
        }
      },
      onError: () => {
        onSubmittingChange(false);
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-500 py-400">
      <div className="flex flex-col items-center gap-100">
        <p className="font-designer-20b text-gray-800">
          <span className="text-rose-500">{data.nickname}</span> 빌더님, 준비
          완료!
        </p>
        <div className="flex flex-col items-center gap-50">
          <p className="font-designer-16b text-gray-800">
            {recommendation.heading}
          </p>
          <p className="font-designer-14r text-gray-500">
            {recommendation.sub}
          </p>
        </div>
      </div>

      <Image
        src="/onboarding/mascot.png"
        alt="Zero and Wonnie mascot"
        width={300}
        height={227}
      />

      <Button
        type="button"
        color="primary"
        size="large"
        aria-busy={isPending}
        onClick={handleFinish}
        disabled={isPending}
        className="h-700 w-full disabled:bg-gray-200 disabled:text-gray-400"
      >
        {recommendation.ctaLabel}
      </Button>
    </div>
  );
}
