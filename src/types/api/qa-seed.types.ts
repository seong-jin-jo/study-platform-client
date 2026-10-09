// DEV 전용 QA 시드 도구 API 타입.
// 백엔드: study-platform-mvp QaCourseSeedController (@Profile("!prod"))
//   GET  /api/v5/admin/qa/course-progress/state?courseId=&memberId=
//   POST /api/v5/admin/qa/course-progress/seed
//   POST /api/v5/admin/qa/course-progress/reset
// 백엔드: study-platform-mvp QaMemberSeedController (@Profile("!prod"))
//   POST /api/v5/admin/qa/member/withdraw

// 백엔드 ViewerStatus enum 과 동일.
export type QaViewerStatus =
  | 'ANONYMOUS'
  | 'LOGIN_ONLY'
  | 'FREE_ENROLLED'
  | 'PAID';

// 백엔드 QaCourseTargetState enum 과 동일.
export type QaCourseTargetState =
  | 'NOT_STARTED'
  | 'HALF'
  | 'FREE_ALMOST_DONE'
  | 'FREE_COMPLETED'
  | 'PAID_NOT_STARTED'
  | 'PAID_ALMOST_DONE'
  | 'PAID_COMPLETED';

export interface QaCourseProgressStateResponse {
  totalPublishedLessons: number;
  completedLessons: number;
  totalPublishedFreeLessons: number;
  completedFreeLessons: number;
  viewerStatus: QaViewerStatus;
  hasCompletionRecord: boolean;
}

export interface QaCourseProgressSeedRequest {
  courseId: number;
  memberId: number;
  targetState: QaCourseTargetState;
}

export interface QaCourseProgressResetRequest {
  courseId: number;
  memberId: number;
}

export interface QaMemberWithdrawRequest {
  memberId: number;
}

export interface QaMemberWithdrawResponse {
  memberId: number;
  withdrawn: boolean;
  withdrawnAt: string;
}
