'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';
import {
  flushPendingKarrotPurchase,
  isAdPixelExcludedPath,
  KARROT_PIXEL_ID,
  META_PIXEL_ID,
} from '@/components/common/analytics/ad-conversions';

/**
 * Meta·당근 픽셀 로더. 픽셀 ID 는 페이지 소스에 그대로 드러나는 공개 값이다.
 * 화면 전환 PageView 는 넣지 않는다. Meta 픽셀이 history 변경을 스스로 잡는다.
 */
export default function AdPixelsScript() {
  const pathname = usePathname();
  const [started, setStarted] = useState(false);
  const allowed = !isAdPixelExcludedPath(pathname ?? '/payment/');
  if (allowed && !started) setStarted(true);
  if (!started && !allowed) return null;

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('set','autoConfig',false,'${META_PIXEL_ID}');
        fbq('init','${META_PIXEL_ID}');
        fbq('track','PageView');`}
      </Script>
      <Script
        id="karrot-pixel-init"
        strategy="afterInteractive"
        onReady={flushPendingKarrotPurchase}
      >
        {`(function (w, d) {
          if (w.karrotPixel) return;
          var k = { stub: true, queue: [] };
          k.init = function () { k.queue.push(['init', arguments, Date.now()]); };
          k.track = function () { k.queue.push(['track', arguments, Date.now()]); };
          w.karrotPixel = k;
          var s = d.createElement('script');
          s.async = true;
          s.src = 'https://karrot-pixel.business.daangn.com/karrot-pixel.js';
          var f = d.getElementsByTagName('script')[0];
          f && f.parentNode ? f.parentNode.insertBefore(s, f) : d.head.appendChild(s);
        })(window, document);
        window.karrotPixel.init('${KARROT_PIXEL_ID}');
        window.karrotPixel.track('ViewPage');`}
      </Script>
    </>
  );
}
