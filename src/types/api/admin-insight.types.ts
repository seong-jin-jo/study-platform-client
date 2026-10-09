// 관리자 회원 상세 부가 현황(수강/구독) 응답 타입. 백엔드 AdminMemberController 의
// /course-status, /notification-subscriptions 응답과 1:1 대응.

export interface AdminMemberCourseStatus {
  courseId: number;
  slug: string;
  title: string;
  accessType: 'FREE' | 'PAID' | (string & {});
  completed: boolean;
  currentLessonOrder: number | null;
  currentLessonTitle: string | null;
  completedLessons: number;
  totalLessons: number;
}

export interface AdminMemberCourseSubscriptionItem {
  courseId: number;
  courseTitle: string;
  contact: string;
  subscribedAt: string;
}

export interface AdminMemberNotificationSubscriptions {
  lessonReminder: {
    hasSetting: boolean;
    notifyHour: number | null;
    notifyMinute: number | null;
  };
  studyWithMe: AdminMemberCourseSubscriptionItem[];
  openAlert: AdminMemberCourseSubscriptionItem[];
}
