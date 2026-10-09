'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { VIBE_LEVEL_OPTIONS } from '@/config/class-onboarding-const';
import type { StepProps } from '../onboarding-types';

export function Step2VibeLevel({
  data,
  updateData,
  onNext,
  isSubmitting,
}: StepProps) {
  const canProceed = !!data.vibeLevel && !isSubmitting;

  return (
    <div className="flex flex-col gap-400">
      <div className="flex flex-col gap-100">
        <p className="font-designer-18b text-gray-800">
          AI로 무언가를 어디까지 만들어 보셨나요?
        </p>
        <p className="font-designer-14r text-gray-500">
          신규 코스 기획에 활용될 예정입니다.
        </p>
      </div>

      <div className="flex flex-col gap-150">
        {VIBE_LEVEL_OPTIONS.map((option) => {
          const selected = data.vibeLevel === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              color="outlined"
              size="large"
              onClick={() => updateData('vibeLevel', option.value)}
              className={cn(
                'h-auto min-h-700 w-full justify-start rounded-150 px-300 py-188 text-left transition-colors duration-200 [&>span]:contents',
                selected
                  ? 'border-rose-500 bg-rose-50 font-designer-14b text-rose-500 hover:bg-rose-50 active:bg-rose-50'
                  : 'border-gray-300 bg-white font-designer-14r text-gray-800 hover:border-rose-300 hover:bg-white active:bg-white',
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* CTA */}
      <Button
        type="button"
        color="primary"
        size="large"
        aria-busy={isSubmitting}
        onClick={onNext}
        disabled={!canProceed}
        className="h-700 w-full disabled:bg-gray-200 disabled:text-gray-400"
      >
        {isSubmitting ? <Loader2 className="size-300 animate-spin" /> : '다음'}
      </Button>
    </div>
  );
}
