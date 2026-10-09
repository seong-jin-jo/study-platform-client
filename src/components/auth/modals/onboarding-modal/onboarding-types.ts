import type {
  ClassOnboardingStep1RequestVibeCodingExperienceLevelEnum,
  ClassOnboardingStep2RequestCareerEnum,
  ClassOnboardingStep2RequestJobsEnum,
} from '@/api/openapi';
import type { InterestOptionId } from '@/config/class-onboarding-const';

export type VibeLevelValue =
  ClassOnboardingStep1RequestVibeCodingExperienceLevelEnum;
export type JobValue = ClassOnboardingStep2RequestJobsEnum;
export type CareerValue = ClassOnboardingStep2RequestCareerEnum;

/** 모달 전 단계에서 누적하는 로컬 입력값. */
export interface OnboardingData {
  // 화면1 (닉네임 + 랜덤 프사 + 약관 + 관심분야)
  nickname: string;
  /** 사용자가 고른 기본 아바타 번호(1~8). 셔플로 변경, 업로드 대신 프리셋 선택. */
  profileImageNumber?: number;
  privacyConsent: boolean;
  termsConsent: boolean;
  marketingConsent: boolean;
  // 화면3 (입문 수준)
  vibeLevel?: VibeLevelValue;
  // Step3 (직무/경력)
  jobs: JobValue[];
  jobEtcText?: string;
  career?: CareerValue;
  // Step4 (관심 분야, 단일 선택)
  interestId?: InterestOptionId;
  interestEtcText?: string;
}

export interface StepProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K],
  ) => void;
  onNext: () => void;
  /** 현재 스텝의 저장 mutation 진행 중 여부 → CTA 로딩/비활성. */
  isSubmitting?: boolean;
}
