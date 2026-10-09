'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const SeoHydrationReadyContext = createContext<(() => void) | null>(null);

export const useSeoHydrationReady = (ready: boolean) => {
  const reportReady = useContext(SeoHydrationReadyContext);

  useEffect(() => {
    if (ready) reportReady?.();
  }, [ready, reportReady]);
};

export default function SeoHydrationBoundary({
  serverSummary,
  interactive,
  waitForInteractiveReady = false,
}: {
  serverSummary: ReactNode;
  interactive: ReactNode;
  waitForInteractiveReady?: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const reportReady = useCallback(() => setHydrated(true), []);

  useEffect(() => {
    if (!waitForInteractiveReady) setHydrated(true);
  }, [waitForInteractiveReady]);

  if (!waitForInteractiveReady) {
    return hydrated ? interactive : serverSummary;
  }

  return (
    <SeoHydrationReadyContext.Provider value={reportReady}>
      {!hydrated && <div className="contents">{serverSummary}</div>}
      <div className={cn(hydrated && 'contents')} hidden={!hydrated}>
        {interactive}
      </div>
    </SeoHydrationReadyContext.Provider>
  );
}
