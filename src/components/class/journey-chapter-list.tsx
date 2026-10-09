'use client';

import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Disclosure } from '@/components/common/ui/disclosure';
import {
  LockIcon,
  LockOpenIcon,
  TimerIcon,
} from '@/components/common/ui/icons/course-icons';
import List from '@/components/common/ui/list';
import type {
  CourseCurriculumChapterResponse,
  CourseJourneyMapLessonResponse,
} from '@/types/api/course.types';
import { type LessonDisplayInfo, mergeLessons } from './home-constants';

interface JourneyChapterListProps {
  chapters: CourseCurriculumChapterResponse[];
  lessonStatusMap: Map<number, CourseJourneyMapLessonResponse>;
  hasMoreChapters: boolean;
  onShowMore: () => void;
  onSelectLesson: (
    lesson: LessonDisplayInfo,
    chapter: CourseCurriculumChapterResponse,
  ) => void;
}

function LessonStatusBadge({ lesson }: { lesson: LessonDisplayInfo }) {
  if (lesson.isFree) {
    return (
      <span className="flex h-250 w-525 items-center justify-center rounded-50 bg-rose-400 font-designer-12r text-text-inverse">
        무료
      </span>
    );
  }
  if (!lesson.accessible) {
    return (
      <span
        role="img"
        aria-label="잠금"
        className="flex h-250 w-525 items-center justify-center rounded-50 bg-gray-400"
      >
        <LockIcon className="size-200 text-gray-0" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="잠금 해제"
      className="flex h-250 w-525 items-center justify-center rounded-50 border border-gray-300 bg-gray-0"
    >
      <LockOpenIcon className="size-200 text-gray-400" />
    </span>
  );
}

export function JourneyChapterList({
  chapters,
  lessonStatusMap,
  hasMoreChapters,
  onShowMore,
  onSelectLesson,
}: JourneyChapterListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  return (
    <div className="mt-800">
      <h2 className="font-designer-28b text-gray-800">Chapter 목록</h2>
      <Disclosure.Group
        className="mt-400 gap-375"
        type="multiple"
        value={Array.from(expanded, String)}
        variant="dense"
        onValueChange={(value) => setExpanded(new Set(value.map(Number)))}
      >
        {chapters.map((chapter, ci) => {
          const isOpen = expanded.has(ci);
          const lessons = mergeLessons(chapter, lessonStatusMap);

          return (
            <Disclosure.Item
              key={chapter.order}
              value={String(ci)}
              className={cn(
                'overflow-hidden rounded-200 border bg-gray-50',
                isOpen ? 'border-rose-200' : 'border-gray-300',
              )}
            >
              <Disclosure.Header className="items-start gap-250 p-300">
                <span
                  className={cn(
                    'flex shrink-0 flex-col items-center justify-center rounded-100 px-200 py-100',
                    isOpen ? 'bg-rose-500' : 'bg-gray-400',
                  )}
                >
                  <span className="font-designer-12r text-gray-0">Chapter</span>
                  <span className="font-designer-20b text-gray-0">
                    {String(chapter.chapterNumber).padStart(2, '0')}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-designer-18b text-gray-600">
                    {chapter.title}
                  </span>
                  {chapter.description && (
                    <span className="mt-75 block font-designer-16r text-gray-600">
                      {chapter.description}
                    </span>
                  )}
                </span>
              </Disclosure.Header>

              {lessons.length > 0 && (
                <Disclosure.Panel className="px-300 pb-300 pt-300">
                  <List className="flex flex-col gap-300">
                    {lessons.map((lesson) => {
                      const row = (
                        <div className="flex items-center justify-between gap-200">
                          <div className="flex min-w-0 flex-1 flex-col gap-100">
                            <div className="flex items-center gap-150">
                              <span className="shrink-0 font-designer-16b text-rose-500">
                                LESSON {String(lesson.order).padStart(2, '0')}
                              </span>
                              <span className="truncate font-designer-16b text-gray-600">
                                {lesson.title}
                              </span>
                            </div>
                            <LessonStatusBadge lesson={lesson} />
                          </div>
                          <div className="flex shrink-0 items-center gap-25 text-rose-500">
                            <TimerIcon className="size-300" />
                            <span className="whitespace-nowrap font-designer-14r">
                              약 {lesson.estimatedMinutes} 분 소요
                            </span>
                          </div>
                        </div>
                      );

                      if (lesson.accessible && lesson.lessonId > 0) {
                        return (
                          <List.Item
                            key={lesson.lessonId}
                            onClick={() => onSelectLesson(lesson, chapter)}
                            className="h-auto bg-transparent p-0 text-left"
                          >
                            {row}
                          </List.Item>
                        );
                      }
                      return (
                        <div key={lesson.lessonId ?? lesson.order}>{row}</div>
                      );
                    })}
                  </List>
                </Disclosure.Panel>
              )}
            </Disclosure.Item>
          );
        })}
      </Disclosure.Group>
      {hasMoreChapters && (
        <Button
          type="button"
          onClick={onShowMore}
          color="outlined"
          size="large"
          className="mt-400 h-650 w-full border-gray-300 bg-gray-0 font-designer-16b text-gray-600"
        >
          더보기
        </Button>
      )}
    </div>
  );
}
