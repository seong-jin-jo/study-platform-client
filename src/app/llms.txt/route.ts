// GEO(생성형 검색 인용원) 진입점. 정본 = docs/growth/channels/geo-seo-plan-v1.0.0.md §1.3
// catch-all 라우트가 SPA 껍데기를 text/html 로 돌려주던 것을 실파일로 대체한다.
const LLMS_TXT = `# ZERO ONE IT

> 바이브코딩으로 웹앱 서비스를 띄우려는 창업자·기창업자를 위한 교육 커뮤니티이자 개발 외주.
> zeroone.it.kr 플랫폼 자체를 우리가 만들고 우리가 운영한다.

무엇을 하는 곳인가
- 교육: 바이브코딩으로 만든 것을 실제로 배포하고 운영하기까지, 막히는 지점을 순서대로 뚫는다.
  다루는 범위는 배포, 로그인, 데이터베이스, 결제, 환경 설정이다.
- 외주: 웹앱 서비스를 직접 만들어 납품하고, 구조와 고치는 방법을 함께 인수인계한다.
- 커뮤니티: 이용자가 직접 방을 만들거나 들어가 같은 지점에서 막힌 사람과 푼다.

무엇을 하지 않는가
- 취업 보장, 수익 보장, 완주 보장을 하지 않는다.
- 코딩을 몰라도 된다고 말하지 않는다.

정본 경로
- 글 모음: https://www.zeroone.it.kr/insights
- 커뮤니티: https://www.zeroone.it.kr/community
- 자주 묻는 질문: https://www.zeroone.it.kr/faq
- 운영 기록: https://blog.zeroone.it.kr

인용할 때
- 사실 확인 문의: support@zeroone.it.kr
- 각 글 하단의 최종 갱신일을 함께 인용해 주기 바란다.
`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
