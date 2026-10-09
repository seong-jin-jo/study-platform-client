'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/ui/button';
import {
  INTEREST_OPTIONS,
  resolveCourseRecommendation,
  resolveCourseSlug,
} from '@/config/class-onboarding-const';
import { useGetCourseList } from '@/hooks/queries/course/course-queries';
import { useOnboardingStore } from '@/stores/use-onboarding-store';
import type { OnboardingData } from '../onboarding-types';

interface Step5CompletionProps {
  data: OnboardingData;
}

export function Step5Completion({ data }: Step5CompletionProps) {
  const router = useRouter();
  const { close } = useOnboardingStore();
  const { data: courses } = useGetCourseList();

  const interestValue = INTEREST_OPTIONS.find(
    (o) => o.id === data.interestId,
  )?.value;
  const recommendation = resolveCourseRecommendation({
    career: data.career,
    jobs: data.jobs,
    interests: interestValue ? [interestValue] : [],
  });

  const handleExplore = () => {
    const slug = resolveCourseSlug(courses, recommendation.slugKeyword);
    close();
    router.push(slug ? `/class/${slug}` : '/class');
  };

  return (
    <div className="flex flex-col items-center gap-500 py-400">
      <div className="flex flex-col items-center gap-100">
        <p className="font-designer-20b text-gray-800">
          <span className="text-rose-500">{data.nickname}</span> 빌더님, 준비
          완료!
        </p>
        <p className="font-designer-16b text-gray-800">
          {recommendation.title}
        </p>
        <p className="font-designer-14r text-gray-500">
          {recommendation.description}
        </p>
      </div>

      {/* 제로워니 점프 영상 (무한 loop). mp4 → video, 모바일 자동재생 위해 muted+playsInline. */}
      <video
        src="/onboarding/jump.mp4"
        poster="/onboarding/mascot.png"
        width={300}
        height={227}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="Zero and Wonnie 점프 애니메이션"
        className="h-auto w-3750"
      />

      <Button
        type="button"
        color="primary"
        size="large"
        aria-busy={!courses}
        onClick={handleExplore}
        className={
          courses
            ? 'h-700 w-full'
            : 'h-700 w-full cursor-wait bg-rose-300 hover:bg-rose-300'
        }
      >
        {courses ? (
          recommendation.ctaLabel
        ) : (
          <Loader2 className="size-300 animate-spin" />
        )}
      </Button>
    </div>
  );
}
