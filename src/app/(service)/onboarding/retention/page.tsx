import type { Metadata } from 'next';
import { Suspense } from 'react';
import OnboardingCapture from '@/components/retention/onboarding-capture';

export const metadata: Metadata = { title: '목표 방 선택 | ZERO-ONE' };

export default function RetentionOnboardingPage() {
  return (
    <Suspense>
      <OnboardingCapture />
    </Suspense>
  );
}
