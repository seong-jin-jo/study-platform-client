'use client';

import type { ReactNode } from 'react';
import { AuthHydrationProvider } from '@/features/auth/model/auth-hydration-context';
import MotionProvider from '@/providers/motion-provider';
import QueryProvider from '@/providers/query-provider';

export default function AppintossProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthHydrationProvider initialSession={{}}>
      <QueryProvider>
        <MotionProvider>{children}</MotionProvider>
      </QueryProvider>
    </AuthHydrationProvider>
  );
}
