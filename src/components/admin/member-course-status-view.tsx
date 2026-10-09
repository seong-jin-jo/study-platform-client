'use client';

import Badge from '@/components/common/ui/badge';
import { useMemberCourseStatusQuery } from '@/hooks/queries/admin/member-insight-queries';

export default function MemberCourseStatusView({
  memberId,
}: {
  memberId: number;
}) {
  const { data, isLoading, isError } = useMemberCourseStatusQuery(memberId);

  if (isLoading) {
    return (
      <p className="font-designer-14r text-text-subtle">
        수강 현황을 불러오는 중입니다.
      </p>
    );
  }
  if (isError) {
    return (
      <p className="font-designer-14r text-text-error">
        수강 현황을 불러오지 못했습니다.
      </p>
    );
  }
  if (!data?.length) {
    return (
      <p className="font-designer-14r text-text-subtle">
        수강(접근권) 중인 클래스가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-200">
      {data.map((course) => (
        <div
          key={course.courseId}
          className="border-border-default rounded-100 flex flex-col gap-100 border p-300"
        >
          <div className="flex flex-wrap items-center gap-100">
            <span className="font-designer-16b text-text-default">
              {course.title}
            </span>
            <Badge color={course.accessType === 'PAID' ? 'purple' : 'orange'}>
              {course.accessType === 'PAID' ? '결제' : '무료'}
            </Badge>
            {course.completed && <Badge color="green">완주</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-x-200 gap-y-50">
            <Field
              label="진행 레슨"
              value={`${course.completedLessons} / ${course.totalLessons}`}
            />
            <Field
              label="현재 레슨"
              value={
                course.currentLessonOrder
                  ? `${course.currentLessonOrder}강 · ${course.currentLessonTitle ?? ''}`
                  : '진행 중 레슨 없음'
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-25">
      <span className="font-designer-12r text-text-subtle">{label}</span>
      <span className="font-designer-14m text-text-default">{value}</span>
    </div>
  );
}
