import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  isOpen: boolean;
  phoneVerificationRequired: boolean;
  isDismissedUntilReload: boolean;
  hasHydrated: boolean;
  open: (options?: { phoneVerificationRequired?: boolean }) => void;
  completePhoneVerificationGate: () => void;
  close: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

type PersistedOnboardingState = Pick<
  OnboardingState,
  'isOpen' | 'phoneVerificationRequired'
>;

/**
 * 온보딩 모달 열림 상태.
 *
 * 열림 상태를 sessionStorage 에 보존한다. 모달은 OAuth 신규가입 직후 `/class?onboarding=true`
 * 쿼리로 한 번 열리고 쿼리는 곧바로 제거되는데, 상태가 메모리에만 있으면 새로고침(F5) 시
 * isOpen 이 false 로 초기화되어 모달이 사라지고 가입을 처음부터 다시 해야 했다.
 * sessionStorage 보존으로 새로고침에도 진행 중인 온보딩이 복원된다(탭 세션 동안만 유지).
 * close() 는 현재 페이지 로드 동안 자동 재오픈을 막는다. 이 플래그는 저장하지 않으므로
 * 새로고침하면 미완료 회원에 대해 전역 게이트가 다시 모달을 열 수 있다.
 *
 * SSR 하이드레이션 불일치를 피하기 위해 자동 재수화를 끄고(skipHydration),
 * 클라이언트 마운트 후 OnboardingModal 에서 명시적으로 rehydrate 한다.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isOpen: false,
      phoneVerificationRequired: false,
      isDismissedUntilReload: false,
      hasHydrated: false,
      open: (options) =>
        set((state) => ({
          isOpen: true,
          isDismissedUntilReload: false,
          phoneVerificationRequired:
            options?.phoneVerificationRequired ??
            state.phoneVerificationRequired,
        })),
      completePhoneVerificationGate: () =>
        set({ phoneVerificationRequired: false }),
      close: () =>
        set((state) => ({
          isOpen: false,
          phoneVerificationRequired: state.phoneVerificationRequired,
          isDismissedUntilReload: true,
        })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'zo-onboarding-modal',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state): PersistedOnboardingState => ({
        isOpen: state.isOpen,
        phoneVerificationRequired: state.phoneVerificationRequired,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      skipHydration: true,
    },
  ),
);
