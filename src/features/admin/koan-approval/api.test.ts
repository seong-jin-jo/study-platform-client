import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosInstance } from '@/api/client/axios';
import {
  editKoan,
  getPendingKoans,
  markKoanViewed,
  publishKoan,
  rejectKoan,
  type PendingKoan,
} from './api';

vi.mock('@/api/client/axios', () => ({
  axiosInstance: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const koan: PendingKoan = {
  koanId: 42,
  categorySlug: 'database',
  question: '트랜잭션은 왜 필요한가요?',
  conceptSummary: '한 단위로 묶습니다.',
  modelAnswerMd: '답안',
  sourceRef: null,
  status: 'REVIEW_PENDING',
  renders: ['SITE', 'MAIL', 'SOCIAL'].map((channel) => ({
    renderId: 1,
    channel: channel as 'SITE' | 'MAIL' | 'SOCIAL',
    subject: null,
    body: `${channel} 본문`,
    publishState: 'HELD',
    verdicts: [],
  })),
};

describe('통합 화두 승인 API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CONSOLE-004 상세 열람 후 세 채널을 단일 publish command로 전달한다', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: {} });

    await markKoanViewed(42);
    await publishKoan(koan);

    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      1,
      'admin/koans/42/viewed',
      {},
    );
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      2,
      'admin/koans/42/publish',
      expect.objectContaining({
        qnaQuestionId: null,
        channels: expect.arrayContaining(['SITE', 'MAIL', 'SOCIAL']),
      }),
    );
  });

  it('CONSOLE-006 반려는 publish 우회 없이 사유를 전용 endpoint에 전달한다', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: {} });

    await rejectKoan(42, '출처 불일치');

    expect(axiosInstance.post).toHaveBeenCalledOnce();
    expect(axiosInstance.post).toHaveBeenCalledWith('admin/koans/42/reject', {
      reason: '출처 불일치',
    });
  });

  it('CONSOLE-007 게시된 화두 정정은 사유를 함께 보낸다', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: {} });

    await editKoan({ ...koan, status: 'PUBLISHED' }, '  사실관계 정정  ');

    expect(axiosInstance.patch).toHaveBeenCalledWith(
      'admin/koans/42',
      expect.objectContaining({ correctionReason: '사실관계 정정' }),
    );
  });

  it('CONSOLE-008 검토 대기 수정은 정정 사유를 보내지 않는다', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: {} });

    await editKoan(koan);

    expect(axiosInstance.patch).toHaveBeenCalledWith(
      'admin/koans/42',
      expect.objectContaining({ correctionReason: null }),
    );
  });

  it('CONSOLE-009 목록 조회는 PUBLISHED 까지 불러 정정 경로를 연다', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
      },
    });

    await getPendingKoans();

    const requested = vi
      .mocked(axiosInstance.get)
      .mock.calls.map((call) => String(call[0]));
    expect(requested).toHaveLength(3);
    expect(requested.some((url) => url.includes('status=PUBLISHED'))).toBe(
      true,
    );
  });

  it('CONSOLE-010 게시 화두가 한 페이지를 넘으면 더 불러올 수 있다고 알린다', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(async (url: string) => ({
      data: {
        data: {
          items: [],
          page: 0,
          size: 20,
          totalElements: url.includes('PUBLISHED') ? 45 : 0,
          totalPages: url.includes('PUBLISHED') ? 3 : 0,
        },
      },
    }));

    const first = await getPendingKoans();

    expect(first.hasMorePublished).toBe(true);
  });

  it('CONSOLE-011 게시 화두 다음 페이지를 요청하면 그 페이지까지 이어 부른다', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: {
          items: [],
          page: 0,
          size: 20,
          totalElements: 21,
          totalPages: 2,
        },
      },
    });

    const page = await getPendingKoans(1);

    const published = vi
      .mocked(axiosInstance.get)
      .mock.calls.map((call) => String(call[0]))
      .filter((url) => url.includes('status=PUBLISHED'));
    expect(published).toEqual([
      'admin/koans?status=PUBLISHED&page=0&size=20',
      'admin/koans?status=PUBLISHED&page=1&size=20',
    ]);
    expect(page.hasMorePublished).toBe(false);
  });
});
