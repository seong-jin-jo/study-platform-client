import type { ClassOnboardingStatusResponse } from '@/api/openapi';

export const isClassOnboardingCompleted = (
  status?: Pick<ClassOnboardingStatusResponse, 'completedAt' | 'lastSavedStep'>,
): boolean =>
  status?.lastSavedStep === 'COMPLETED' || Boolean(status?.completedAt);
