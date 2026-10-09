import {
  ClassOnboardingStep1RequestVibeCodingExperienceLevelEnum as VibeLevel,
  ClassOnboardingStep2RequestCareerEnum as Career,
  ClassOnboardingStep2RequestJobsEnum as Job,
  ClassOnboardingStep3RequestInterestsEnum as Interest,
} from '@/api/openapi';
import type { CourseSummaryResponse } from '@/types/api/course.types';

/**
 * 클래스 온보딩 enum ↔ 한글 라벨 매핑.
 * enum 값은 모두 생성 DTO의 *Enum 상수에서 import 한다(하드코딩 금지).
 * 라벨/순서는 Figma 4프레임(576:10012 / 585:10397 / 585:10679 / 3355:1091) 기준.
 */

// ─── Step1: 입문 수준 (단일 선택) ──────────────────────────────────────────────
// Figma 4라벨 기준. enum VibeLevel.TriedWithAiButGaveUp 는 의도적으로 미사용
// (재개 시 레거시 TRIED_WITH_AI_BUT_GAVE_UP 값은 프리필되지 않음 — 허용).
export const VIBE_LEVEL_OPTIONS = [
  {
    value: VibeLevel.CuriousNoExperience,
    label: 'AI 툴(챗지피티, 제미나이, 클로드 등)을 써본 적 없어요',
  },
  {
    value: VibeLevel.CopyPasteWithAi,
    label: 'AI한테 질문하고 답변 활용해본 적 있어요',
  },
  {
    value: VibeLevel.BuiltWorkingResult,
    label: 'AI로 업무나 작업 흐름을 바꿔본 적 있어요',
  },
  {
    value: VibeLevel.DeployedAndShared,
    label: 'AI로 뭔가를 직접 만들거나 배포해본 적 있어요',
  },
] as const;

// ─── Step2: 직무 (다중 선택, 최대 2개) ─────────────────────────────────────────
export const JOB_MAX_SELECT = 2;
export const JOB_ETC_VALUE = Job.ClassOnboardingOther;

export const JOB_OPTIONS = [
  { value: Job.ClassOnboardingDesigner, label: '디자이너' },
  { value: Job.ClassOnboardingMarketer, label: '마케터' },
  {
    value: Job.ClassOnboardingServicePlannerPmPo,
    label: '서비스 기획자 / PM/ PO',
  },
  { value: Job.ClassOnboardingStudentJobSeeker, label: '학생/취준생' },
  { value: Job.ClassOnboardingEntrepreneur, label: '창업가 / 예비 창업자' },
  {
    value: Job.ClassOnboardingNonMajorSelfDevelopment,
    label: '비개발직군',
  },
  { value: Job.ClassOnboardingDeveloper, label: '개발자' },
] as const;

// ─── Step2: 경력 (단일 선택) ───────────────────────────────────────────────────
// ⚠️ 계약 갭: Figma 경력 칩 'C-Level/대표'에 대응하는 Career enum 값이 없다.
// 미사용 enum BEGINNER로 잠정 매핑한다. BE에 'C-Level/대표' 경력 enum 추가 요청 필요.
export const CAREER_OPTIONS = [
  { value: Career.JobSeeker, label: '학생/취업준비생' },
  { value: Career.Junior, label: '주니어(0~3년)' },
  { value: Career.Middle, label: '미들(4~7년)' },
  { value: Career.Senior, label: '시니어(8년~)' },
  { value: Career.Beginner, label: 'C-Level/대표' }, // TODO(BE): C-Level/대표 전용 enum 필요
  { value: Career.Retired, label: '퇴직자' },
] as const;

// ─── Step3: 관심 분야 (단일 선택) ─────────────────────────────────────────────
// ⚠️ 계약 갭: '개인 생산성 향상 도구'에 대응하는 Interest enum 없음 → OTHER 매핑.
// BE에 PERSONAL_PRODUCTIVITY enum 추가 요청 필요.
// '개인 생산성 향상 도구'와 '기타'가 둘 다 OTHER 이므로 etcText 유무로 구분:
//   - 기타            → OTHER + interestEtcText(사용자 입력)
//   - 개인 생산성     → OTHER + interestEtcText 없음
export const INTEREST_OPTIONS = [
  {
    id: 'PORTFOLIO_SITE',
    value: Interest.PortfolioSite,
    label: '내 포트폴리오 사이트',
    requiresEtc: false,
  },
  {
    id: 'SIDE_PROJECT_WEB_APP',
    value: Interest.SideProjectWebApp,
    label: '사이드 프로젝트 웹/앱',
    requiresEtc: false,
  },
  {
    id: 'WORK_AUTOMATION_TOOL',
    value: Interest.WorkAutomationTool,
    label: '업무 자동화 도구',
    requiresEtc: false,
  },
  {
    id: 'PERSONAL_PRODUCTIVITY',
    value: Interest.Other,
    label: '개인 생산성 향상 도구',
    requiresEtc: false,
  },
  {
    id: 'MONETIZATION_SERVICE',
    value: Interest.MonetizationService,
    label: '수익화 서비스(창업, 부업)',
    requiresEtc: false,
  },
  {
    id: 'OTHER_ETC',
    value: Interest.Other,
    label: '기타(상세 내용 기재)',
    requiresEtc: true,
  },
] as const;

export type InterestOptionId = (typeof INTEREST_OPTIONS)[number]['id'];

/**
 * 저장된 interests enum 배열 + etcText 로부터 단일선택 UI id 복원(재개용).
 * OTHER 는 etcText 유무로 '기타' / '개인 생산성 향상 도구'를 구분한다.
 */
export function interestIdFromStatus(
  interests?: string[],
  etcText?: string,
): InterestOptionId | undefined {
  const value = interests?.[0];
  if (!value) return undefined;
  if (value === Interest.Other) {
    return etcText?.trim() ? 'OTHER_ETC' : 'PERSONAL_PRODUCTIVITY';
  }
  return INTEREST_OPTIONS.find((o) => o.value === value && !o.requiresEtc)?.id;
}

// ─── 완료 모달: 코스 추천 정적 매핑 ───────────────────────────────────────────
// complete 응답은 {completed, completedAt}만 주므로 추천은 FE 정적 분기(annotation 규칙).
export interface CourseRecommendation {
  /** 추천 헤드라인 (예: "바이브 코딩 입문자 코스를 추천드려요!") */
  title: string;
  /** 한 줄 설명 */
  description: string;
  /** CTA 라벨 */
  ctaLabel: string;
  /** 코스 목록에서 slug 매칭에 사용할 제목 키워드 */
  slugKeyword: string;
}

const RECO_BEGINNER: CourseRecommendation = {
  title: '바이브 코딩 입문자 코스를 추천드려요!',
  description: 'AI를 활용하여 나만의 웹사이트 제작 기본기를 다져보세요.',
  ctaLabel: '바이브 코딩 입문자 코스 둘러보기',
  slugKeyword: '입문',
};

// Cowork 코스는 아직 OPEN 전 — resolveCourseSlug 가 첫 OPEN 코스(입문자)로 폴백한다.
const RECO_COWORK: CourseRecommendation = {
  title: 'Cowork 입문자 코스를 추천드려요!',
  description: 'AI를 활용하여 나만의 업무 생산성을 확보할 기본기를 다져보세요.',
  ctaLabel: 'Cowork 입문자 코스 둘러보기',
  slugKeyword: 'Cowork',
};

const RECO_MONETIZATION: CourseRecommendation = {
  title: 'ZERO-ONE에서 바이브 코딩 수익화 트랙을 준비하고 있어요.',
  description: '먼저 AI를 활용하여 나만의 웹사이트 제작 기본기를 다져보세요.',
  ctaLabel: '바이브 코딩 입문자 코스 둘러보기',
  slugKeyword: '입문',
};

/**
 * 온보딩 입력값으로 추천 코스를 결정한다(annotation 분기).
 * 우선순위: 업무 자동화 > 수익화 > 기본
 * career/jobs 는 향후 분기 여지로 입력 계약에 유지한다.
 */
export function resolveCourseRecommendation(input: {
  career?: string;
  jobs?: string[];
  interests?: string[];
}): CourseRecommendation {
  const interests = input.interests ?? [];
  if (interests.includes(Interest.WorkAutomationTool)) return RECO_COWORK;
  if (interests.includes(Interest.MonetizationService))
    return RECO_MONETIZATION;
  return RECO_BEGINNER; // 기본
}

/** 코스 목록에서 추천 코스 slug 해석. 못 찾으면 첫 OPEN 코스, 그래도 없으면 null. */
export function resolveCourseSlug(
  courses: CourseSummaryResponse[] | undefined,
  keyword: string,
): string | null {
  if (!courses?.length) return null;
  // keyword('입문' 등)가 여러 코스 제목에 들어갈 수 있다 → 매칭이 모호하면 OPEN 코스를 우선해
  // 배열 순서에 의존하지 않도록 한다.
  const keywordMatches = courses.filter((c) => c.title.includes(keyword));
  const matched =
    keywordMatches.find((c) => c.status === 'OPEN') ?? keywordMatches[0];
  if (matched) return matched.slug;
  const firstOpen = courses.find((c) => c.status === 'OPEN');
  return firstOpen?.slug ?? courses[0]?.slug ?? null;
}
