import Script from 'next/script';

/**
 * Microsoft Clarity 로더.
 *
 * 왜 이제야 붙나: 프로젝트와 GitHub 비밀값(NEXT_PUBLIC_CLARITY_PROJECT_ID)은
 * 2026-05-29 부터 있었고 배포 워크플로도 그 값을 .env 로 넣고 있었다.
 * 없던 것은 그 값을 실제로 쓰는 코드 한 줄이었다. 그래서 여태 세션 녹화가
 * 한 건도 안 잡혔고, "사람들이 어느 화면에서 나가나"를 물으면 답이 없었다.
 *
 * 값이 없으면 아무것도 렌더하지 않는다. 로컬 개발과 비밀값 미설정 환경에서
 * 콘솔 에러를 내지 않기 위해서다.
 */
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export default function ClarityScript() {
  if (!CLARITY_PROJECT_ID) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
