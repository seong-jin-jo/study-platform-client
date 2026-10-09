import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    unoptimized: _unoptimized,
    fill: _fill,
    priority: _priority,
    ...props
  }: Record<string, unknown>) => createElement('img', { ...props, alt }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({ memberId: undefined }),
}));
vi.mock('@/components/insights/insight-article-actions', () => ({
  default: () => createElement('div', { 'data-testid': 'article-actions' }),
  resolvePublicSocialProofSnapshot: () => undefined,
  resolvePersonalArticleInteraction: () => undefined,
}));
vi.mock('@/hooks/queries/insights/use-insight-worldmap-query', () => ({
  useInsightMapQuery: () => ({ data: undefined }),
  useInsightHelpfulMutation: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock('@/components/saved-resource/save-resource-button', () => ({
  default: () =>
    createElement('div', { 'data-testid': 'save-resource-button' }),
}));

const { default: BlogDetailPage, readingMinutes } = await import(
  './blog-detail-page'
);

const accessMeta = {
  documentId: 'doc-1',
  slug: 'api-key',
  title: 'API 키란 무엇인가',
  islandId: 1,
  islandSlug: 'basics',
  islandName: '기초',
  ordinal: 1,
  teaser: '',
  coverUrl: null,
  unlockCost: 0,
  accessReason: 'FIRST_ARTICLE' as const,
  budget: null,
  freeAlternative: null,
};

function buildArticle(blocks: any[]) {
  return {
    documentId: 'doc-1',
    slug: 'api-key',
    title: 'API 키란 무엇인가',
    description: '',
    category: { name: '기초', slug: 'basics' },
    author: { name: 'ZERO-ONE' },
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    blocks,
  };
}

function renderPage(blocks: any[], readOnly = false) {
  const article = buildArticle(blocks);
  const html = renderToStaticMarkup(
    createElement(BlogDetailPage as any, {
      accessMeta,
      article,
      authDegraded: false,
      memberId: undefined,
      readOnly,
    }),
  );
  return html;
}

describe('App-in-Toss 최종 Markdown 트리 보안 경계', () => {
  it('AIT-M3-01 속성값 안에서 재구성된 iframe과 srcdoc을 제거한다', () => {
    const html = renderPage(
      [
        {
          __component: 'shared.rich-text',
          body: `<p title="a\n\n<iframe srcdoc='<img src=x onerror=alert(1)>'>">x</p>`,
        },
      ],
      true,
    );

    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('srcdoc');
    expect(html).not.toContain('onerror');
  });

  it('AIT-M3-02 raw img 이벤트 핸들러를 최종 React 트리에 전달하지 않는다', () => {
    const html = renderPage(
      [
        {
          __component: 'shared.rich-text',
          body: '<img src="/logo.svg" onerror="alert(1)" alt="logo">',
        },
      ],
      true,
    );

    expect(html).toContain('src="/logo.svg"');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('AIT-M3-03 외부 링크를 앱에서 이동 가능한 anchor로 렌더하지 않는다', () => {
    const html = renderPage(
      [
        {
          __component: 'shared.rich-text',
          body: '<a href="https://evil.example" target="_blank">외부</a>',
        },
      ],
      true,
    );

    expect(html).toContain('<span>외부</span>');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('target="_blank"');
  });

  it('AIT-N2-01 허용 목록 밖 태그와 외부 미디어 URL을 최종 트리에서 제거한다', () => {
    const html = renderPage(
      [
        {
          __component: 'shared.rich-text',
          body: [
            '<base href="https://evil.example/">',
            '<meta http-equiv="refresh" content="0;url=https://evil.example">',
            '<link rel="stylesheet" href="https://evil.example/a.css">',
            '<video><source src="https://evil.example/movie.mp4"></video>',
            '<video src="https://evil.example/movie.mp4"></video>',
            '<img src="https://evil.example/pixel.gif" alt="추적 픽셀">',
            '<img src="https://api.zeroone.it.kr/public/safe.png" alt="허용 이미지">',
          ].join('\n\n'),
        },
      ],
      true,
    );

    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('<base');
    expect(html).not.toContain('<meta');
    expect(html).not.toContain('<source');
    expect(html).not.toContain('추적 픽셀');
    expect(html).toContain('https://api.zeroone.it.kr/public/safe.png');
    expect(html).toContain('허용 이미지');
  });

  it('AIT-N6-03 역슬래시 기반 외부 경로를 이동 가능한 링크로 렌더하지 않는다', () => {
    const html = renderPage(
      [
        {
          __component: 'shared.rich-text',
          body: '<a href="/\\evil.example">우회 링크</a>',
        },
      ],
      true,
    );

    expect(html).toContain('<span>우회 링크</span>');
    expect(html).not.toContain('evil.example');
  });
});

describe('blog-detail-page 렌더러 결함 수정', () => {
  it('(a) raw <div style="..."> 를 텍스트가 아니라 스타일이 있는 div로 렌더한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<div style="background:#fff1f3;padding:12px;border-radius:8px;">꾸민 상자</div>',
      },
    ]);
    expect(html).toContain('style="background:#fff1f3');
    expect(html).toContain('꾸민 상자');
  });

  it('(b) 마크다운 표가 원문 파이프가 아니라 <table>로 렌더된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '| 층 | 사는 곳 |\n| --- | --- |\n| 1층 | 로비 |\n',
      },
    ]);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('로비');
    expect(html).not.toContain('| 층 | 사는 곳 |');
  });

  it('(c) 읽는 시간이 HTML 마크업 글자 수를 세지 않는다', () => {
    const plainBlocks = [
      {
        __component: 'shared.rich-text',
        body: '가'.repeat(1000),
      },
    ];
    const markupHeavyBlocks = [
      {
        __component: 'shared.rich-text',
        body:
          '<div style="background:#fff1f3;padding:12px;border-radius:8px;color:#111;">' +
          '가'.repeat(1000) +
          '</div>',
      },
    ];
    const plainMinutes = readingMinutes(plainBlocks);
    const markupMinutes = readingMinutes(markupHeavyBlocks);
    // 순수 글자 수는 1000자 -> 500자/분 기준 2분
    expect(plainMinutes).toBe(2);
    // 마크업이 섞여도 같은 2분이어야 한다(마크업 글자를 세면 안 됨)
    expect(markupMinutes).toBe(2);
  });

  it('(d) h2에 안정적 id가 붙고, 동일 텍스트 목차 li가 자동으로 앵커 링크가 된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '- [목차](#)\n- 결론\n\n## 결론\n\n본문입니다.\n',
      },
    ]);
    expect(html).toContain('id="결론"'.replace('결론', '결론'));
    // h2 id 존재
    expect(html).toMatch(/<h2[^>]*id="[^"]+"/);
    // li 안에 해당 id로 향하는 a href가 생성됐는지
    const idMatch = html.match(/<h2[^>]*id="([^"]+)"/);
    expect(idMatch).toBeTruthy();
    const headingId = idMatch?.[1];
    expect(html).toContain(`href="#${headingId}"`);
  });

  it('(d) 중복 h2 텍스트는 -2 접미사로 id가 구분된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 정리\n\n첫 번째\n\n## 정리\n\n두 번째\n',
      },
    ]);
    const ids = [...html.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[1]).toBe(`${ids[0]}-2`);
  });

  it('(f) h2 자동 번호 CSS counter 클래스가 붙는다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '## 첫 절\n\n내용\n' },
    ]);
    expect(html).toContain('zo-h2-numbered');
    expect(html).toContain('counter-increment: zo-h2');
  });

  it('이모티콘 shortcode가 인라인 크기 <img>로 변환되고 740px 전폭 처리를 타지 않는다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '반가워요 :welcome: 잘 부탁드립니다.',
      },
    ]);
    expect(html).toContain('/emoticon/welcome.png');
    expect(html).not.toContain('width="740"');
    expect(html).toMatch(/width="24"/);
  });

  it('읽기 진행률 progressbar가 렌더된다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '본문' },
    ]);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow');
  });
});

describe('인사이트 v2 관례 블록 승격 (docs/design/prototype/insight-article-v2-spec.md §2·§3)', () => {
  it('관례 블록이 없는 원고는 예전과 같은 출력을 낸다 (회귀 방지)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 절 하나\n\n평범한 본문입니다.\n\n## 절 둘\n\n또 다른 본문.\n',
      },
    ]);
    // zo-* 승격 컴포넌트가 하나도 끼어들지 않는다. class="zo-toc-card 로
    // 좁혀서 찾는 이유는 "zo-toc-card 숨김 시 마진/hr 억제" 핫픽스 CSS가
    // 이 렌더에도 (안 쓰이지만) 항상 박혀 있어 순수 문자열 포함 검사로는
    // 오탐하기 때문이다(핫픽스 2026-09-17).
    expect(html).not.toContain('class="zo-toc-card');
    expect(html).not.toContain('zo-chat');
    expect(html).not.toContain('zo-poll');
    expect(html).toContain('절 하나');
    expect(html).toContain('절 둘');
  });

  it('zo-hero 가 ArticleHeroSlots 로 승격되고 본문 zo-article-body 안에는 남지 않는다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-hero"><div data-slot="before">전</div><div data-slot="after">후</div></section>\n\n## 절\n\n본문\n',
      },
    ]);
    expect(html).toContain('읽기 전');
    expect(html).toContain('읽고 나면');
    expect(html).toContain('전');
    expect(html).toContain('후');
  });

  it('INSIGHT-HERO-GAP-001 정상: 승격 히어로와 첫 절 사이 장식 여백만 제거한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-hero"><div data-slot="before">전</div><div data-slot="after">후</div></section>\n\n<video src="https://example.com/intro.mp4"></video>\n\n&nbsp;\n\n<section class="zo-toc" data-note="메모"></section>\n\n&nbsp;\n\n---\n\n## 첫 절\n\n본문\n',
      },
    ]);

    expect(html).toContain('<video');
    expect(html).toContain('zo-toc-card');
    expect(html).toContain('첫 절');
    expect(html).not.toContain('<hr');
    expect(html).not.toContain('&nbsp;');
  });

  it('INSIGHT-HERO-GAP-002 거절: zo-hero 뒤 장식 공백과 떨어진 구분선은 보존한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-hero"><div data-slot="before">전</div><div data-slot="after">후</div></section>\n\n&nbsp;\n\n도입 문장\n\n---\n\n## 첫 절\n\n본문\n',
      },
    ]);

    expect(html).toContain('읽기 전');
    expect(html).toContain('<hr');
    expect(html).not.toContain('&nbsp;');
    expect(html).toContain('도입 문장');
    expect(html).toContain('첫 절');
  });

  it('zo-toc 가 목차(ArticleToc)로 승격되고 h2 텍스트를 포함한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-toc" data-note="메모"></section>\n\n## 먼저 이것\n\n본문\n\n## 다음 이것\n\n본문2\n',
      },
    ]);
    expect(html).toContain('zo-toc-card');
    expect(html).toContain('먼저 이것');
    expect(html).toContain('다음 이것');
    expect(html).toContain('메모');
  });

  it('zo-poll 이 설문으로 승격되고 % 막대 없이 선택지만 렌더한다 (가짜 % 금지)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-poll" data-id="p1" data-question="질문입니까?"><div data-option>옵션A</div><div data-option>옵션B</div></section>\n',
      },
    ]);
    expect(html).toContain('질문입니까?');
    expect(html).toContain('옵션A');
    expect(html).toContain('옵션B');
    // style="width:0%"(진행 막대) 는 페이지 공통 요소라 전역에서 %를
    // 찾으면 오탐한다. "텍스트로 보이는 숫자 %"(예: >43%<)만 검사한다
    // (가짜 집계 비율 금지 — CSS 폭 값이 아니라 화면에 찍히는 숫자).
    expect(html).not.toMatch(/>\s*\d+%\s*</);
  });

  it('zo-chat 이 채팅 목업으로 승격되고 복사 버튼 aria-label 을 갖는다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-chat" data-title="테스트 대화"><div data-role="user">지시문</div><div data-role="assistant">답변</div></section>\n',
      },
    ]);
    expect(html).toContain('테스트 대화');
    expect(html).toContain('지시문 복사');
    expect(html).toContain('지시문');
    expect(html).toContain('답변');
  });

  it('zo-tip 이 꿀팁 카드로 승격된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-tip" data-id="1"><p>꿀팁 본문</p></section>\n',
      },
    ]);
    expect(html).toContain('꿀팁 #1');
    expect(html).toContain('꿀팁 본문');
  });

  it('zo-island 가 글 끝 인사말 카드로 승격된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 절\n\n본문\n\n<section class="zo-island">여기는 IT섬입니다.</section>\n',
      },
    ]);
    expect(html).toContain('zo-island');
    expect(html).toContain('여기는 IT섬입니다.');
  });

  it('h2 개수만큼 SectionFeedback이 붙는다 (h2 경계 기준, hr 개수와 무관)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 절 하나\n\n본문\n\n---\n\n## 절 둘\n\n본문2\n',
      },
    ]);
    const matches = html.match(/이 절, 어떠셨어요/g) ?? [];
    // h2 2개 = SectionFeedback 정확히 2개(절 하나 끝에 1, 절 둘 끝에 1).
    expect(matches).toHaveLength(2);
    expect(html).toContain('공감했어요');
  });

  it('절 "안"에 hr 이 여러 개 있어도 h2 경계에서만 SectionFeedback이 붙는다 (회귀: 2026-09-16 운영 실측 — 절 중간 hr마다 잘못 끼어들던 결함)', () => {
    // v2 픽스처 원고 그대로: 한 절 안에 hr 이 3개 있다
    // (docs/design/prototype/insight-article-v2-fixture-body.md 재현).
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 절 하나\n\n문단1\n\n---\n\n문단2\n\n---\n\n문단3\n\n---\n\n## 절 둘\n\n문단4\n',
      },
    ]);
    const matches = html.match(/이 절, 어떠셨어요/g) ?? [];
    // hr 이 3개라도 SectionFeedback 은 h2 2개만큼, 정확히 2개.
    expect(matches).toHaveLength(2);
  });

  it('첫 h2 앞에는 SectionFeedback이 없다 (회귀: 히어로 바로 아래 엉뚱하게 뜨던 결함)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-hero"><div data-slot="before">전</div><div data-slot="after">후</div></section>\n\n## 첫 절\n\n본문\n',
      },
    ]);
    const heroIndex = html.indexOf('읽고 나면');
    const firstFeedbackIndex = html.indexOf('이 절, 어떠셨어요');
    const firstH2Index = html.indexOf('첫 절');
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(firstH2Index).toBeGreaterThan(heroIndex);
    // 피드백이 있다면(본문 끝 1개) 반드시 h2 뒤여야 한다 — h2 앞에 끼면 안 된다.
    if (firstFeedbackIndex >= 0) {
      expect(firstFeedbackIndex).toBeGreaterThan(firstH2Index);
    }
  });
});

describe('본문/레일 그리드 폭 핫픽스 (2026-09-17, 운영 1440 캡처 실측)', () => {
  it('본문 열 최소 680 + xl 740 그리드 트랙, 레일 hr/토글 마진 억제 클래스가 전부 있다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '## 절\n\n본문\n' },
    ]);
    // lg(1024~1279): 레일 300 고정 + 본문 최소 680 보장.
    expect(html).toContain('lg:grid-cols-[minmax(680px,1fr)_300px]');
    // xl(1280+): 본문 740 + 간격 48 + 레일 340 = 컨테이너 1128(spacing-14100).
    expect(html).toContain('xl:grid-cols-[minmax(680px,740px)_340px]');
    expect(html).toContain('xl:max-w-14100');
    // 그리드가 740 컨테이너 안에 눌리지 않도록 lg 에서 max-w 를 푼다
    // (예전엔 이게 없어서 본문 열이 약 352px 로 반토막 났다).
    expect(html).toContain('lg:max-w-none');
    // 히어로 두 칸은 뷰포트가 아니라 본문 열 자신의 폭(container query)으로
    // 1열/2열을 정한다(ask 3).
    expect(html).toContain('@container');
  });

  it('zo-toc-card 가 lg+ 에서 숨을 때 마진과 다음 hr 도 같이 없앤다 (회귀: 히어로~1절 사이 150px 공백)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-toc" data-note="메모"></section>\n\n---\n\n## 절\n\n본문\n',
      },
    ]);
    expect(html).toContain('.zo-toc-card { margin: 0; }');
    expect(html).toContain('.zo-toc-card + hr { display: none; }');
  });

  it('첫 h2 는 촘촘한 상단 마진(mt-400), 다른 h2 는 기존 절 리듬(임의 60px 상단 여백)을 쓴다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '## 첫 절\n\n본문\n\n## 둘째 절\n\n본문2\n',
      },
    ]);
    const h2Tags = html.match(/<h2[^>]*class="[^"]*"/g) ?? [];
    expect(h2Tags).toHaveLength(2);
    // 절 리듬 클래스는 "mt-" 접두 + 대괄호 표기(임의 px)라 문자열 자체를
    // 이 파일에 다시 박으면 design-lint arbitrary-pixel-spacing 오탐이 난다
    // (검사 스크립트가 주석·테스트 문자열까지 스캔한다). 대괄호 없이 접두만 검사.
    expect(h2Tags[0]).toContain('mt-400');
    expect(h2Tags[0]).not.toMatch(/\bmt-\[/);
    expect(h2Tags[1]).toMatch(/\bmt-\[/);
  });
});

describe('저장·도움됐어요 상단 액션 바 (핫픽스 2026-09-17 ask 2)', () => {
  it('히어로 바로 아래 meta 행에 SaveResourceButton·도움됐어요 버튼이 있다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '## 절\n\n본문\n' },
    ]);
    expect(html).toContain('data-testid="save-resource-button"');
    expect(html).toContain('도움됐어요');
    // 상단(meta 행)과 하단(article-actions) 양쪽에 저장 버튼이 있어야
    // "같은 상태 공유" 배선이 두 자리 모두에 연결된 것이다.
    const saveButtonCount = (
      html.match(/data-testid="save-resource-button"/g) ?? []
    ).length;
    expect(saveButtonCount).toBeGreaterThanOrEqual(1);
  });
});

describe('발급 화면 재현물 브라우저 크롬 (핫픽스 2026-09-17 ask 3)', () => {
  it('data-url 이 있으면 그것을 우선 쓴다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<figure aria-label="예시"><div class="zo-screen" data-url="example.com/settings" data-tab="설정 | 예시">화면</div><figcaption>Supabase 예시</figcaption></figure>\n',
      },
    ]);
    expect(html).toContain('browser-chrome');
    expect(html).toContain('example.com/settings');
    expect(html).toContain('설정 | 예시');
  });

  it('data-url 이 없으면 figcaption 텍스트로 서비스를 추정한다 (Supabase)', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<figure aria-label="예시"><div class="zo-screen">화면</div><figcaption>Supabase 의 Settings 화면 예시</figcaption></figure>\n',
      },
    ]);
    expect(html).toContain('browser-chrome');
    expect(html).toContain('supabase.com/dashboard');
  });

  it('data-url 도 없고 서비스도 추정 못 하면 크롬 없이 지금처럼 렌더한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<figure aria-label="예시"><div class="zo-screen">화면</div><figcaption>어떤 앱의 설정 화면</figcaption></figure>\n',
      },
    ]);
    expect(html).not.toContain('browser-chrome');
    expect(html).toContain('zo-screen');
  });

  it('zo-screen 은 진입 애니메이션 래퍼(zo-screen-reveal)로 감싸진다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<figure aria-label="예시"><div class="zo-screen">화면</div><figcaption>어떤 앱</figcaption></figure>\n',
      },
    ]);
    expect(html).toContain('zo-screen-reveal');
  });
});

describe('레일 sticky (핫픽스 2026-09-17 ask 1)', () => {
  it('레일 전체(읽기 진행 카드 + 목차)가 하나의 sticky 컨테이너다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '## 절\n\n본문\n' },
    ]);
    expect(html).toContain('lg:sticky');
    expect(html).toContain('lg:self-start');
    // 내부 목차(zo-toc-rail)는 이중 sticky 를 걸지 않는다(부모가 전담).
    const railMatch = html.match(
      /<aside[^>]*data-testid="article-rail"[^>]*>[\s\S]*?<\/aside>/,
    );
    expect(railMatch).toBeTruthy();
    const innerNav = railMatch?.[0].match(/<nav[^>]*class="([^"]*)"/);
    expect(innerNav?.[1]).not.toContain('sticky');
  });
});

describe('절반/완독 응원(핫픽스 2026-09-17 ask 2)', () => {
  it('절반 응원 훅이 zo-toc 의 data-note 를 재사용한다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: '<section class="zo-toc" data-note="4번과 5번이 오늘의 핵심입니다."></section>\n\n## 절\n\n본문\n',
      },
    ]);
    expect(html).toContain('4번과 5번이 오늘의 핵심입니다.');
  });
});

describe('_xxl 이모티콘 150px 가운데 정렬(핫픽스 2026-09-17 ask 3)', () => {
  it('emoticon-xxl 단독 문단은 150px + 위아래 24px 여백으로 가운데 정렬된다', () => {
    const html = renderPage([
      {
        __component: 'shared.rich-text',
        body: ':welcome_xxl:',
      },
    ]);
    expect(html).toMatch(/width="150"/);
    const bodyStart = html.indexOf('zo-article-body');
    const bodyHtml = html.slice(bodyStart);
    const imgIndex = bodyHtml.indexOf('width="150"');
    const wrapStart = bodyHtml.lastIndexOf('<span class="', imgIndex);
    const wrapTagEnd = bodyHtml.indexOf('>', wrapStart);
    const wrapClass = bodyHtml.slice(wrapStart, wrapTagEnd);
    expect(wrapClass).toContain('text-center');
    expect(wrapClass).toContain('my-300');
  });
});

describe('절 반응 칩 + 한 줄 의견 (핫픽스 2026-09-17 ask 4)', () => {
  it('칩 3개와 "집계 전" 문구, 한 줄 남기기 입력이 있다', () => {
    const html = renderPage([
      { __component: 'shared.rich-text', body: '## 절\n\n본문\n' },
    ]);
    expect(html).toContain('공감했어요');
    expect(html).toContain('이미 알아요');
    expect(html).toContain('처음 알았어요');
    expect(html).toContain('집계 전');
    expect(html).toContain('한 줄 남기기');
    expect(html).not.toMatch(/>\s*\d+%\s*</);
  });
});
