export interface KoanSummary {
  koanId: number;
  categorySlug: string;
  categoryName: string;
  question: string;
  answerCount: number;
  viewCount: number;
  publishedAt: string;
}

export interface KoanCorrection {
  correctionId: number;
  fieldName: string;
  beforeText: string | null;
  afterText: string | null;
  reason: string;
  correctedAt: string;
}

export interface KoanDetail extends KoanSummary {
  conceptSummary: string;
  modelAnswerMd: string;
  qnaQuestionId: number;
  corrections: KoanCorrection[];
}

export interface KoanPage {
  items: KoanSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
