'use client';

import { History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ClassDetailBenefitsSection } from '@/components/class/class-detail-benefits-section';
import { ClassDetailBuilderFeedSection } from '@/components/class/class-detail-builder-feed-section';
import { CHAPTERS } from '@/components/class/class-detail-constants';
import {
  type ChapterForRoadmap,
  ClassDetailCurriculumSection,
} from '@/components/class/class-detail-curriculum-section';
import { ClassDetailDifferentiationSection } from '@/components/class/class-detail-differentiation-section';
import { ClassDetailFaqSection } from '@/components/class/class-detail-faq-section';
import { ClassDetailInstructorSection } from '@/components/class/class-detail-instructor-section';
import { ClassDetailRoadmapSection } from '@/components/class/class-detail-roadmap-section';
import {
  useGetBuilderFeedShowcase,
  useGetCourseCurriculum,
  useGetCourseDetail,
} from '@/hooks/queries/course/course-queries';

export default function ClassIntroOnly({ slug }: { slug: string }) {
  const [expandedChapters, setExpandedChapters] = useState(new Set([0]));
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { data: curriculum } = useGetCourseCurriculum(slug);
  const { data: courseDetail, isError } = useGetCourseDetail(slug);
  const { data: builderFeedShowcase } = useGetBuilderFeedShowcase(
    courseDetail?.courseId ?? 0,
  );

  const chaptersForRoadmap = useMemo<ChapterForRoadmap[]>(() => {
    if (curriculum?.chapters?.length) {
      return curriculum.chapters.map((chapter) => ({
        num: String(chapter.chapterNumber).padStart(2, '0'),
        title: chapter.title,
        desc: '',
        lessons: chapter.lessons.map((lesson) => ({
          order: lesson.order,
          title: lesson.title,
          lessonId: lesson.lessonId,
          estimatedMinutes: lesson.estimatedMinutes,
          isFree: lesson.isFree,
        })),
      }));
    }
    return CHAPTERS.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((title, index) => ({
        order: index + 1,
        title,
        lessonId: undefined,
        estimatedMinutes: 0,
        isFree: false,
      })),
    }));
  }, [curriculum]);

  const toggleChapter = (index: number) => {
    setExpandedChapters((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (isError) {
    return (
      <section className="mx-auto max-w-page px-600 py-800" role="alert">
        <h1 className="font-designer-28b text-text-strong">
          클래스 소개를 불러오지 못했어요
        </h1>
        <p className="mt-125 font-designer-16r text-text-subtle">
          잠시 뒤 클래스 목록에서 다시 열어주세요.
        </p>
      </section>
    );
  }

  return (
    <div className="w-full pb-800" data-testid="appintoss-class-intro">
      <div className="mx-auto max-w-page px-200 pt-400 md:px-300 md:pt-500 lg:px-600 lg:pt-600">
        <h1 className="font-designer-36b text-gray-800">
          {courseDetail?.title ?? '클래스 소개'}
        </h1>
        {courseDetail?.durationDays !== null ? (
          <div className="mt-300 flex items-center gap-75">
            <History className="size-300 shrink-0 text-text-subtlest" />
            <p className="font-designer-16m text-gray-800">
              평균 {courseDetail?.durationDays ?? '-'}일 소요
            </p>
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-page px-200 pt-400 md:px-300 md:pt-500 lg:px-600">
        <div className="min-w-0 space-y-400 lg:space-y-800">
          <ClassDetailRoadmapSection />
          <ClassDetailDifferentiationSection />
          <ClassDetailBuilderFeedSection
            builderFeedShowcase={builderFeedShowcase}
          />
          <ClassDetailBenefitsSection hideCommercialOffers />
          <ClassDetailCurriculumSection
            chaptersForRoadmap={chaptersForRoadmap}
            expandedChapters={expandedChapters}
            onToggleChapter={toggleChapter}
          />
          <ClassDetailInstructorSection />
          <ClassDetailFaqSection
            expandedFaq={expandedFaq}
            onToggleFaq={(index) =>
              setExpandedFaq((current) => (current === index ? null : index))
            }
          />
        </div>
      </div>
    </div>
  );
}
