'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isOAuthRedirectPath } from '@/features/auth/model/scrub-oauth-redirect-url';
import {
  getAttributionParams,
  trackAttribution,
} from '@/utils/attribution-tracker';

export default function PageViewTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 로그인 복귀 화면은 주소에 토큰이 실려 있다. page_location 에 그대로 담기므로 보내지 않는다.
    // 이 화면은 곧 다른 경로로 replace 되고, 그 경로의 page_view 가 정상 집계된다.
    if (isOAuthRedirectPath(pathname)) return;

    // 유입경로 추적 (첫 방문 시 저장, 이후 방문 시 업데이트)
    trackAttribution();

    // Attribution 파라미터 가져오기
    const attributionParams = getAttributionParams();

    sendGTMEvent({
      event: 'page_view',
      page_title: document.title || pathname,
      page_location: window.location.href,
      page_path: pathname,
      ...attributionParams,
    });
  }, [pathname]);

  return null;
}
