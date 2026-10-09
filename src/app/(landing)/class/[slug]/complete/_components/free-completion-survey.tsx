'use client';

import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import ChipButton from '@/components/common/ui/chip/chip-button';
import StarRatingInput from '@/components/common/ui/star-rating-input';
import {
  useGetCourseFeedbackOptions,
  useSubmitCourseFeedback,
} from '@/hooks/queries/course/course-queries';
import { useToastStore } from '@/stores/use-toast-store';
import type { CourseCompletionRecapResponse } from '@/types/api/course.types';
import { FreeSurveyReward } from './free-survey-reward';

interface Props {
  courseId: number;
  recap: CourseCompletionRecapResponse;
  slug: string;
}

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <ChipButton
      type="button"
      variant="state"
      active={selected}
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-300 py-150 font-designer-14m transition-colors',
        selected
          ? 'border-border-brand bg-rose-50 text-text-brand'
          : 'border-gray-300 text-gray-600 hover:border-gray-400',
      )}
    >
      {label}
    </ChipButton>
  );
}

export function FreeCompletionSurvey({ courseId, recap, slug }: Props) {
  const showToast = useToastStore((s) => s.showToast);

  const {
    data: options,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
  } = useGetCourseFeedbackOptions(courseId);
  const submitFeedback = useSubmitCourseFeedback();

  const [satisfaction, setSatisfaction] = useState(0);
  const [nps, setNps] = useState(0);
  const [goodIds, setGoodIds] = useState<number[]>([]);
  const [badIds, setBadIds] = useState<number[]>([]);
  const [freeText, setFreeText] = useState('');
  // undefined = 미제출, null | string = 제출 완료 (쿠폰 유무 구분)
  const [rewardCouponCode, setRewardCouponCode] = useState<
    string | null | undefined
  >(undefined);

  const toggle = (
    id: number,
    list: number[],
    setList: (next: number[]) => void,
  ) => {
    setList(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);
  };

  const isValid =
    satisfaction > 0 && nps > 0 && goodIds.length > 0 && badIds.length > 0;

  const handleSubmit = () => {
    if (!isValid || !courseId) return;
    submitFeedback.mutate(
      {
        courseId,
        request: {
          satisfaction,
          nps,
          goodOptionIds: goodIds,
          badOptionIds: badIds,
          freeText: freeText.trim(),
        },
      },
      {
        onSuccess: (response) => {
          setRewardCouponCode(response.couponCode ?? null);
          showToast('피드백이 제출되었어요. 감사합니다!');
        },
        // onError: MutationCache 전역 핸들러가 토스트 + Sentry 처리
      },
    );
  };

  if (rewardCouponCode !== undefined) {
    return (
      <FreeSurveyReward
        recap={recap}
        couponCode={rewardCouponCode}
        slug={slug}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto flex max-w-page flex-col items-center px-600 py-800">
        <h1 className="text-center font-designer-28b text-gray-800">
          코스를 완주하셨어요!
        </h1>
        <p className="mt-150 text-center font-designer-20r text-gray-800">
          정말 잘하셨어요! 첫 발을 내딛으셨어요
        </p>

        {/* Recap stats */}
        <div className="mt-500 flex gap-200">
          {[
            {
              value: String(recap?.latestCompletedLessonCount ?? 0),
              label: '내가 들은 레슨 수',
            },
            { value: String(recap?.studyDays ?? 0), label: '일간의 여정' },
            {
              value: String(recap?.siteUrlCount ?? 0),
              label: '나만의 사이트 수',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex h-1250 w-2125 flex-col items-center justify-center gap-25 rounded-200 border border-rose-300 bg-rose-50"
            >
              <p className="font-designer-24sb text-text-brand">{s.value}</p>
              <p className="font-designer-16m text-gray-1000">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-600 flex w-full max-w-10700 flex-col gap-500">
          {/* 설문 섹션 헤더 */}
          <div className="flex flex-col gap-100">
            <h2 className="font-designer-20b text-gray-800">
              여러분의 소중한 의견이 필요해요
            </h2>
            <p className="font-designer-16r text-gray-600">
              여러분의 피드백으로 더 좋은 클래스를 만들겠습니다. 3분이면
              충분해요!
            </p>
          </div>

          {/* 전체 만족도 */}
          <section className="flex flex-col gap-200">
            <h2 className="font-designer-20b text-gray-800">
              전체 만족도 <span className="text-text-brand">*</span>
            </h2>
            <StarRatingInput
              appearance="lesson"
              precision="whole"
              value={satisfaction}
              onChange={setSatisfaction}
            />
          </section>

          {/* NPS */}
          <section className="flex flex-col gap-200">
            <h2 className="font-designer-20b text-gray-800">
              이 코스를 추천하시겠어요?{' '}
              <span className="text-text-brand">*</span>
            </h2>
            <div className="flex flex-wrap gap-150">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <ChipButton
                  key={n}
                  type="button"
                  variant="state"
                  active={nps === n}
                  onClick={() => setNps(n)}
                  aria-pressed={nps === n}
                  className={cn(
                    'flex size-575 items-center justify-center rounded-150 border font-designer-16m transition-colors',
                    nps === n
                      ? 'border-border-brand bg-rose-50 text-text-brand'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400',
                  )}
                >
                  {n}
                </ChipButton>
              ))}
            </div>
          </section>

          {/* Options three-state */}
          {isOptionsLoading ? (
            <p className="font-designer-16r text-gray-400">불러오는 중...</p>
          ) : isOptionsError ? (
            <p className="font-designer-16r text-gray-400">
              설문 항목을 불러오지 못했어요.
            </p>
          ) : !options?.goodOptions.length && !options?.badOptions.length ? (
            <p className="font-designer-16r text-gray-400">
              설문 항목이 없어요.
            </p>
          ) : (
            <>
              {/* 가장 좋았던 점 */}
              <section className="flex flex-col gap-200">
                <h2 className="font-designer-20b text-gray-800">
                  가장 좋았던 점 <span className="text-text-brand">*</span>
                </h2>
                <div className="flex flex-wrap gap-150">
                  {options.goodOptions.map((opt) => (
                    <Chip
                      key={opt.optionId}
                      label={opt.label}
                      selected={goodIds.includes(opt.optionId)}
                      onToggle={() => toggle(opt.optionId, goodIds, setGoodIds)}
                    />
                  ))}
                </div>
              </section>

              {/* 가장 아쉬웠던 점 */}
              <section className="flex flex-col gap-200">
                <h2 className="font-designer-20b text-gray-800">
                  가장 아쉬웠던 점 <span className="text-text-brand">*</span>
                </h2>
                <div className="flex flex-wrap gap-150">
                  {options.badOptions.map((opt) => (
                    <Chip
                      key={opt.optionId}
                      label={opt.label}
                      selected={badIds.includes(opt.optionId)}
                      onToggle={() => toggle(opt.optionId, badIds, setBadIds)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 자유 의견 */}
          <section className="flex flex-col gap-200">
            <h2 className="font-designer-20b text-gray-800">자유 의견</h2>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              aria-label="자유 의견"
              placeholder="더 하고 싶은 이야기를 자유롭게 남겨주세요."
              className={cn(
                'h-1625 w-full resize-none rounded-200 border border-border-default p-300 font-designer-16m text-gray-800 outline-none placeholder:text-gray-400',
                'focus:border-border-brand',
              )}
            />
          </section>

          <Button
            type="button"
            color="primary"
            size="large"
            onClick={handleSubmit}
            disabled={!isValid || submitFeedback.isPending}
            className="h-750 w-full font-designer-18b disabled:bg-gray-200 disabled:text-gray-400"
          >
            피드백 제출하기
          </Button>
        </div>
      </div>
    </div>
  );
}
