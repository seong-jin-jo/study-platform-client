'use client';

import { Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ClassOnboardingStatusResponse } from '@/api/openapi';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import IconButton from '@/components/common/ui/icon-button';
import {
  CAREER_OPTIONS,
  INTEREST_OPTIONS,
  interestIdFromStatus,
  JOB_OPTIONS,
  VIBE_LEVEL_OPTIONS,
} from '@/config/class-onboarding-const';
import {
  useClassOnboardingStatusQuery,
  useCompleteOnboardingMutation,
  useSaveStep1Mutation,
  useSaveStep2Mutation,
  useSaveStep3Mutation,
} from '@/hooks/queries/class-onboarding/use-class-onboarding';
import { useOnboardingStore } from '@/stores/use-onboarding-store';
import { getRandomDefaultAvatarNumber } from '@/utils/avatar-utils';
import type {
  CareerValue,
  JobValue,
  OnboardingData,
  VibeLevelValue,
} from './onboarding-types';
import { Step0PhoneVerification } from './steps/step-0-phone-verification';
import { Step1Nickname } from './steps/step-1-nickname';
import { Step2VibeLevel } from './steps/step-2-vibe-level';
import { Step3JobCareer } from './steps/step-3-job-career';
import { Step5Completion } from './steps/step-5-completion';

// 화면 0~4.
//  0: 소셜 제공자 전화번호가 없을 때만 노출하는 휴대폰 본인인증
//  1: 닉네임 + 랜덤 프사 + 약관 + 관심분야
//  2: 직무 + 경력
//  3: 입문 수준(AI 활용 경험)
//  4: 완료
// 백엔드 step 저장 계약(STEP_1=닉네임+약관+입문수준, STEP_2=직무·경력, STEP_3=관심)은
// 화면 순서와 다르므로, 입력은 화면 1~3에서 모으고 화면3 "다음"에서 백엔드 순서대로
// 일괄 저장한 뒤 complete까지 확정하고 완료 화면을 표시한다.
type Screen = 0 | 1 | 2 | 3 | 4;

const DOTS = [0, 1, 2, 3];
const PHONE_FIRST_DOTS = [0, 1, 2, 3, 4];

export function OnboardingModal() {
  const isOpen = useOnboardingStore((s) => s.isOpen);
  const hasHydrated = useOnboardingStore((s) => s.hasHydrated);
  // 새로고침(F5) 복원: SSR 하이드레이션 불일치를 피하려 store 자동 재수화를 끈 상태라,
  // 클라이언트 마운트 후 sessionStorage 의 열림 상태를 명시적으로 재수화한다.
  useEffect(() => {
    if (hasHydrated) {
      return;
    }

    // rehydrate 는 동기 스토리지에서 Promise 또는 void 를 반환할 수 있어 안전하게 분기한다.
    const rehydrated = useOnboardingStore.persist.rehydrate();
    if (rehydrated instanceof Promise) {
      rehydrated.catch(() => {});
    }
  }, [hasHydrated]);
  // 열릴 때마다 새로 마운트 → 상태 초기화 effect 불필요(mount-gate).
  if (!hasHydrated) return null;
  if (!isOpen) return null;
  return <OnboardingModalGate />;
}

/** 진입 시 진행상태 조회 → 재개 지점/프리필 확정 후 본 플로우 렌더. */
function OnboardingModalGate() {
  const phoneVerificationRequired = useOnboardingStore(
    (s) => s.phoneVerificationRequired,
  );
  const { data: status, isLoading } = useClassOnboardingStatusQuery();

  if (isLoading && !phoneVerificationRequired) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center px-300">
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div className="relative flex h-2500 w-full max-w-7500 items-center justify-center rounded-200 bg-white">
          <Loader2 className="size-500 animate-spin text-rose-500" />
        </div>
      </div>,
      document.body,
    );
  }

  return <OnboardingModalContent status={status} />;
}

// 입력은 화면3에서 일괄 저장되므로, 저장이 끝난 상태(STEP_4_READY/COMPLETED)만 완료 화면으로
// 재개하고 그 외에는 처음부터 다시 진행한다(부분 저장 잔여는 화면3 재저장으로 멱등 복구).
function screenFromStatus(status?: ClassOnboardingStatusResponse): Screen {
  switch (status?.lastSavedStep) {
    case 'STEP_3':
    case 'STEP_4_READY':
    case 'COMPLETED':
      return 4;
    default:
      return 1;
  }
}

// step1 이상 저장된 상태(동의가 이미 제출됨)인지.
const STEP1_SAVED_STEPS: ReadonlySet<string> = new Set([
  'STEP_1',
  'STEP_2',
  'STEP_3',
  'STEP_4_READY',
  'COMPLETED',
]);

// status 는 레거시 enum(예: IT_PRACTITIONER_DESIGN)을 줄 수 있다.
// 현재 칩/옵션에 없는 값은 프리필에서 제외해야 "보이지 않는 직무가 선택 슬롯을 먹는" 버그를 막는다.
const VALID_JOB_VALUES: ReadonlySet<string> = new Set(
  JOB_OPTIONS.map((o) => o.value),
);
const VALID_CAREER_VALUES: ReadonlySet<string> = new Set(
  CAREER_OPTIONS.map((o) => o.value),
);
const VALID_VIBE_VALUES: ReadonlySet<string> = new Set(
  VIBE_LEVEL_OPTIONS.map((o) => o.value),
);

/** 저장된 status → 로컬 입력값 프리필. */
function dataFromStatus(
  status?: ClassOnboardingStatusResponse,
): OnboardingData {
  // profileImageNumber 는 아직 생성 OpenAPI 타입에 없어 확장 캐스팅으로 읽는다(재생성 시 수렴).
  const statusWithProfile = status as
    | (ClassOnboardingStatusResponse & { profileImageNumber?: number })
    | undefined;
  // 동의는 닉네임 존재가 아니라 step1 저장 여부로 판단(기존 멤버 닉네임만 있는 경우 오인 방지).
  const step1Saved = STEP1_SAVED_STEPS.has(status?.lastSavedStep ?? '');
  const vibe = status?.vibeCodingExperienceLevel;
  const career = status?.career;
  return {
    nickname: status?.nickname ?? '',
    // 저장된 아바타가 있으면 그대로, 없으면(신규) 랜덤 기본 아바타를 미리 띄운다.
    profileImageNumber:
      statusWithProfile?.profileImageNumber ?? getRandomDefaultAvatarNumber(),
    privacyConsent: step1Saved,
    termsConsent: step1Saved,
    marketingConsent: false,
    vibeLevel:
      vibe && VALID_VIBE_VALUES.has(vibe)
        ? (vibe as VibeLevelValue)
        : undefined,
    // 현재 칩에 없는 레거시 직무 값은 제외(보이지 않는 선택 슬롯 점유 방지).
    jobs: (status?.jobs ?? []).filter((j) =>
      VALID_JOB_VALUES.has(j),
    ) as JobValue[],
    jobEtcText: status?.jobEtcText,
    career:
      career && VALID_CAREER_VALUES.has(career)
        ? (career as CareerValue)
        : undefined,
    interestId: interestIdFromStatus(
      status?.interests,
      status?.interestEtcText,
    ),
    interestEtcText: status?.interestEtcText,
  };
}

function OnboardingModalContent({
  status,
}: {
  status?: ClassOnboardingStatusResponse;
}) {
  const { close, completePhoneVerificationGate } = useOnboardingStore();
  const phoneVerificationRequired = useOnboardingStore(
    (s) => s.phoneVerificationRequired,
  );
  const [currentScreen, setCurrentScreen] = useState<Screen>(() =>
    phoneVerificationRequired ? 0 : screenFromStatus(status),
  );
  const [data, setData] = useState<OnboardingData>(() =>
    dataFromStatus(status),
  );
  const completionRequestedRef = useRef(false);

  const step1 = useSaveStep1Mutation();
  const step2 = useSaveStep2Mutation();
  const step3 = useSaveStep3Mutation();
  const { mutateAsync: completeOnboarding, isPending: isCompleting } =
    useCompleteOnboardingMutation();

  const isSaving = step1.isPending || step2.isPending || step3.isPending;
  const isSubmitting = isSaving || isCompleting;

  const updateData = <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K],
  ) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const goTo = useCallback((screen: Screen) => setCurrentScreen(screen), []);

  const completeAndShowCompletion = useCallback(() => {
    if (completionRequestedRef.current) return Promise.resolve();
    completionRequestedRef.current = true;

    return completeOnboarding()
      .then(() => {
        goTo(4);
      })
      .catch(() => {
        completionRequestedRef.current = false;
        // 개별 mutation 의 전역 onError(MutationCache)가 토스트/Sentry 를 처리한다.
      });
  }, [completeOnboarding, goTo]);

  const handlePhoneVerificationNext = useCallback(() => {
    completePhoneVerificationGate();
    goTo(screenFromStatus(status));
  }, [completePhoneVerificationGate, goTo, status]);

  useEffect(() => {
    const lastSavedStep = status?.lastSavedStep;
    const isReadyToComplete =
      lastSavedStep === 'STEP_4_READY' || lastSavedStep === 'STEP_3';

    if (
      phoneVerificationRequired ||
      currentScreen !== 4 ||
      status?.completedAt ||
      !isReadyToComplete
    ) {
      return;
    }

    const completionTimer = window.setTimeout(() => {
      completeAndShowCompletion().catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(completionTimer);
  }, [
    completeAndShowCompletion,
    currentScreen,
    phoneVerificationRequired,
    status?.completedAt,
    status?.lastSavedStep,
  ]);

  // 화면1(닉네임+프사+약관+관심) → 화면2: 저장 없이 진행.
  const handleScreen1Next = () => goTo(2);

  // 화면2(직무+경력) → 화면3: 저장 없이 진행.
  const handleScreen2Next = () => goTo(3);

  // 화면3(입문수준) "다음": 입력 전체를 백엔드 step 순서대로 일괄 저장 후 완료 화면으로.
  const handleScreen3Next = async () => {
    const {
      nickname,
      privacyConsent,
      termsConsent,
      marketingConsent,
      profileImageNumber,
      vibeLevel,
      jobs,
      jobEtcText,
      career,
    } = data;
    const option = INTEREST_OPTIONS.find((o) => o.id === data.interestId);
    if (!vibeLevel || !career || jobs.length === 0 || !option) return;

    try {
      await step1.mutateAsync({
        nickname,
        privacyConsent,
        termsConsent,
        marketingConsent,
        vibeCodingExperienceLevel: vibeLevel,
        profileImageNumber,
      });
      await step2.mutateAsync({ jobs, jobEtcText, career });
      await step3.mutateAsync({
        interests: [option.value],
        interestEtcText: option.requiresEtc ? data.interestEtcText : undefined,
      });
      await completeAndShowCompletion();
    } catch {
      // 개별 mutation 의 전역 onError(MutationCache)가 토스트/Sentry 를 처리한다.
      // 부분 저장(예: step1만 성공)으로 남아도 재시도 시 step1부터 멱등 재저장된다.
    }
  };

  const visibleScreen: Screen = phoneVerificationRequired ? 0 : currentScreen;

  const handleBack = () => {
    if (visibleScreen > 1) goTo((visibleScreen - 1) as Screen);
  };

  const showPhoneFirstProgress =
    phoneVerificationRequired || visibleScreen === 0;
  const dots = showPhoneFirstProgress ? PHONE_FIRST_DOTS : DOTS;
  const activeDot = showPhoneFirstProgress ? visibleScreen : visibleScreen - 1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isSubmitting ? undefined : close}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative flex max-h-[90vh] w-full max-w-7500 flex-col overflow-hidden rounded-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-500 pt-400 pb-300">
          {/* Back button (1번/완료 화면에서는 숨김) */}
          {visibleScreen > 1 && visibleScreen < 4 ? (
            <IconButton
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              size="md"
              className="text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              label="이전"
            >
              <X className="size-300 rotate-[135deg]" />
            </IconButton>
          ) : (
            <div className="size-500" />
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-100">
            {dots.map((dot) => (
              <div
                key={dot}
                className={cn(
                  'rounded-full bg-gray-300 transition-[width,background-color] duration-300',
                  dot === activeDot ? 'h-125 w-350 bg-rose-500' : 'h-125 w-125',
                )}
              />
            ))}
          </div>

          {/* Close button */}
          <IconButton
            type="button"
            onClick={close}
            disabled={isSubmitting}
            size="md"
            className="text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            label="닫기"
          >
            <X className="size-300" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-500 pb-500">
          <div
            key={visibleScreen}
            className="animate-in slide-in-from-right-4 fade-in fill-mode-forwards flex flex-col duration-300"
          >
            {visibleScreen === 0 && (
              <Step0PhoneVerification
                defaultRealName={data.nickname}
                onNext={handlePhoneVerificationNext}
              />
            )}
            {visibleScreen === 1 && (
              <Step1Nickname
                data={data}
                updateData={updateData}
                onNext={handleScreen1Next}
              />
            )}
            {visibleScreen === 2 && (
              <Step3JobCareer
                data={data}
                updateData={updateData}
                onNext={handleScreen2Next}
              />
            )}
            {visibleScreen === 3 && (
              <Step2VibeLevel
                data={data}
                updateData={updateData}
                onNext={handleScreen3Next}
                isSubmitting={isSaving}
              />
            )}
            {visibleScreen === 4 && <Step5Completion data={data} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
