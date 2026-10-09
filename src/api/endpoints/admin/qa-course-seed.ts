import { axiosInstanceV5 } from '@/api/client/axios';
import type {
  QaCourseProgressResetRequest,
  QaCourseProgressSeedRequest,
  QaCourseProgressStateResponse,
  QaMemberWithdrawRequest,
  QaMemberWithdrawResponse,
} from '@/types/api/qa-seed.types';

// DEV 전용 QA 시드 도구 endpoint. baseURL 은 axiosInstanceV5(/api/v5/) 기준.

const QA_COURSE_PROGRESS_PATH = 'admin/qa/course-progress';
const QA_MEMBER_PATH = 'admin/qa/member';

export const getQaCourseProgressState = async (
  courseId: number,
  memberId: number,
): Promise<QaCourseProgressStateResponse> => {
  const res = await axiosInstanceV5.get(
    `${QA_COURSE_PROGRESS_PATH}/state?courseId=${courseId}&memberId=${memberId}`,
  );

  return res.data.content;
};

export const seedQaCourseProgress = async (
  request: QaCourseProgressSeedRequest,
): Promise<QaCourseProgressStateResponse> => {
  const res = await axiosInstanceV5.post(
    `${QA_COURSE_PROGRESS_PATH}/seed`,
    request,
  );

  return res.data.content;
};

export const resetQaCourseProgress = async (
  request: QaCourseProgressResetRequest,
): Promise<QaCourseProgressStateResponse> => {
  const res = await axiosInstanceV5.post(
    `${QA_COURSE_PROGRESS_PATH}/reset`,
    request,
  );

  return res.data.content;
};

// 선택한 회원을 실제 계정 탈퇴(익명화) 처리한다. 되돌릴 수 없다.
export const withdrawQaMember = async (
  request: QaMemberWithdrawRequest,
): Promise<QaMemberWithdrawResponse> => {
  const res = await axiosInstanceV5.post(`${QA_MEMBER_PATH}/withdraw`, request);

  return res.data.content;
};
