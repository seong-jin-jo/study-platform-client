import { describe, expect, it } from 'vitest';
import { isClassOnboardingCompleted } from './class-onboarding-status';

describe('isClassOnboardingCompleted', () => {
  it('returns true only for completed onboarding status', () => {
    expect(
      isClassOnboardingCompleted({
        lastSavedStep: 'COMPLETED',
        completedAt: undefined,
      }),
    ).toBe(true);
    expect(
      isClassOnboardingCompleted({
        lastSavedStep: 'STEP_4_READY',
        completedAt: '2026-07-03T15:00:00',
      }),
    ).toBe(true);
    expect(
      isClassOnboardingCompleted({
        lastSavedStep: 'STEP_4_READY',
        completedAt: undefined,
      }),
    ).toBe(false);
    expect(isClassOnboardingCompleted(undefined)).toBe(false);
  });
});
