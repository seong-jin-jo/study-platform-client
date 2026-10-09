import { axiosInstance } from '@/api/client/axios';

/** 필드 이름은 승인 계약 api-contract-sprint8-seo-v1.0.12 §3.2 를 그대로 따른다. */
export type KoanRender = {
  renderId: number;
  channel: 'SITE' | 'MAIL' | 'SOCIAL';
  subject: string | null;
  body: string;
  publishState: string;
  verdicts: Array<{ axis: string; verdict: string; reason: string }>;
};

export type KoanStatus = 'REVIEW_PENDING' | 'QUEUED' | 'PUBLISHED';

export type PendingKoan = {
  koanId: number;
  categorySlug: string;
  question: string;
  conceptSummary: string;
  modelAnswerMd: string;
  sourceRef: string | null;
  status: KoanStatus;
  scheduledPublishAt?: string | null;
  updatedAt?: string | null;
  renders: KoanRender[];
};

type Envelope<T> = { data: T };

type KoanPage = {
  items: PendingKoan[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/**
 * 게시된 화두도 함께 부른다. 정정(correction)은 PUBLISHED 화두에만 있는 경로라
 * 목록에 나오지 않으면 콘솔에서 도달할 방법이 없다.
 */
const QUEUE_STATUSES: KoanStatus[] = ['REVIEW_PENDING', 'QUEUED'];

export const KOAN_PAGE_SIZE = 20;

export type KoanConsoleList = {
  items: PendingKoan[];
  /** 아직 못 불러온 게시 화두가 남아 있으면 true. 콘솔이 "더 보기"를 띄운다. */
  hasMorePublished: boolean;
};

/**
 * 검토 대기와 예약은 처리해야 할 큐 전체를, 게시 화두는 최신순 한 페이지씩 부른다.
 * 백엔드가 PUBLISHED 를 published_at DESC 로 주기 때문에 방금 게시한 건은 항상 첫 페이지에
 * 있고, 그보다 오래된 정정 대상은 publishedPage 를 올려 이어 부른다. 고정 page=0 한 장만
 * 부르면 게시 화두가 21건이 되는 순간 정정 진입점(FR-005)이 통째로 막힌다.
 */
export async function getPendingKoans(
  publishedPage = 0,
): Promise<KoanConsoleList> {
  const [queues, published] = await Promise.all([
    Promise.all(
      QUEUE_STATUSES.map((status) =>
        axiosInstance.get<Envelope<KoanPage>>(
          `admin/koans?status=${status}&page=0&size=${KOAN_PAGE_SIZE}`,
        ),
      ),
    ),
    Promise.all(
      Array.from({ length: publishedPage + 1 }, (_, page) =>
        axiosInstance.get<Envelope<KoanPage>>(
          `admin/koans?status=PUBLISHED&page=${page}&size=${KOAN_PAGE_SIZE}`,
        ),
      ),
    ),
  ]);
  const publishedPages = published.map((response) => response.data.data);
  const lastPublishedPage = publishedPages[publishedPages.length - 1];
  return {
    items: [
      ...queues.flatMap((response) => response.data.data.items),
      ...publishedPages.flatMap((page) => page.items),
    ],
    hasMorePublished: publishedPage + 1 < (lastPublishedPage?.totalPages ?? 0),
  };
}

export async function markKoanViewed(koanId: number) {
  await axiosInstance.post(`admin/koans/${koanId}/viewed`, {});
}

/**
 * PUBLISHED 화두는 정정 사유가 필수다(계약 §3.3). 사유 없이 보내면 서버가 400 을 준다.
 * 그 밖의 상태에서는 사유 자체가 계약 밖이라 null 로 보낸다.
 */
export async function editKoan(koan: PendingKoan, correctionReason?: string) {
  await axiosInstance.patch(`admin/koans/${koan.koanId}`, {
    question: koan.question,
    conceptSummary: koan.conceptSummary,
    modelAnswerMd: koan.modelAnswerMd,
    sourceRef: koan.sourceRef,
    scheduledPublishAt: koan.scheduledPublishAt ?? null,
    correctionReason:
      koan.status === 'PUBLISHED' ? (correctionReason?.trim() ?? '') : null,
    renders: koan.renders.map((render) => ({
      channel: render.channel,
      subject: render.subject,
      body: render.body,
    })),
  });
}

export async function publishKoan(
  koan: PendingKoan,
  scheduledPublishAt: string | null = null,
) {
  await axiosInstance.post(`admin/koans/${koan.koanId}/publish`, {
    channels: koan.renders.map((render) => render.channel),
    qnaQuestionId: null,
    scheduledPublishAt,
  });
}

/** 필드 이름은 승인 계약 api-contract-sprint8-seo-v1.0.12 §3.2 재고 응답을 그대로 따른다. */
export type KoanInventory = {
  reviewPendingCount: number;
  approvedInventoryCount: number;
  publishedCount: number;
  oldestPendingDays: number;
  fallbackLevel: number;
  generationPaused: boolean;
  mailPaused: boolean;
  recommendedBatchSize: number;
  maxBatchSize: number;
};

export async function getKoanInventory(): Promise<KoanInventory> {
  const response = await axiosInstance.get<Envelope<KoanInventory>>(
    'admin/koans/inventory',
  );
  return response.data.data;
}

export async function cancelKoanSchedule(koanId: number) {
  await axiosInstance.post(`admin/koans/${koanId}/cancel-schedule`, {});
}

export async function rejectKoan(koanId: number, reason: string) {
  await axiosInstance.post(`admin/koans/${koanId}/reject`, { reason });
}
