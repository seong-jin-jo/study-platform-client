import { beforeEach, describe, expect, it, vi } from 'vitest';

type OnboardingStoreModule = typeof import('./use-onboarding-store');

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const importStoreWithStorage = async (
  storage: Storage,
): Promise<OnboardingStoreModule> => {
  vi.resetModules();
  vi.stubGlobal('sessionStorage', storage);

  return import('./use-onboarding-store');
};

describe('useOnboardingStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('인증 전 닫기는 휴대폰 인증 gate를 소비하지 않는다', async () => {
    const { useOnboardingStore } = await importStoreWithStorage(
      createMemoryStorage(),
    );

    useOnboardingStore.getState().open({ phoneVerificationRequired: true });
    useOnboardingStore.getState().close();

    expect(useOnboardingStore.getState().isOpen).toBe(false);
    expect(useOnboardingStore.getState().phoneVerificationRequired).toBe(true);
    expect(useOnboardingStore.getState().isDismissedUntilReload).toBe(true);

    useOnboardingStore.getState().open();

    expect(useOnboardingStore.getState().isOpen).toBe(true);
    expect(useOnboardingStore.getState().phoneVerificationRequired).toBe(true);
  });

  it('새로고침 재수화 후에도 인증 전 phone gate를 유지한다', async () => {
    const storage = createMemoryStorage();
    const { useOnboardingStore } = await importStoreWithStorage(storage);

    useOnboardingStore.getState().open({ phoneVerificationRequired: true });
    useOnboardingStore.getState().close();

    const reloadedModule = await importStoreWithStorage(storage);
    await reloadedModule.useOnboardingStore.persist.rehydrate();

    expect(reloadedModule.useOnboardingStore.getState().isOpen).toBe(false);
    expect(
      reloadedModule.useOnboardingStore.getState().phoneVerificationRequired,
    ).toBe(true);

    reloadedModule.useOnboardingStore.getState().open();

    expect(reloadedModule.useOnboardingStore.getState().isOpen).toBe(true);
    expect(
      reloadedModule.useOnboardingStore.getState().phoneVerificationRequired,
    ).toBe(true);
  });

  it('휴대폰 인증 완료 후에만 phone gate를 해제한다', async () => {
    const { useOnboardingStore } = await importStoreWithStorage(
      createMemoryStorage(),
    );

    useOnboardingStore.getState().open({ phoneVerificationRequired: true });
    useOnboardingStore.getState().completePhoneVerificationGate();
    useOnboardingStore.getState().close();
    useOnboardingStore.getState().open();

    expect(useOnboardingStore.getState().phoneVerificationRequired).toBe(false);
  });
});
