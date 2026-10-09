import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), 'utf8');

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.(css|ts|tsx)$/.test(entry) && !entry.includes('.test.')
      ? [path]
      : [];
  });

describe('MOB-095 모바일 사용성 계약', () => {
  it('MOB-TYPO-001 1023px 이하 본문 토큰은 16, 작은 보조 토큰은 13으로 승격한다', () => {
    const css = readSource('src/app/global.css');

    expect(css).toContain('@media (max-width: 1023.98px)');
    for (const size of [10, 11, 12]) {
      for (const weight of ['r', 'm', 'b']) {
        const utilityStart = css.indexOf(
          `@utility font-designer-${size}${weight} {`,
        );
        const nextUtility = css.indexOf('@utility ', utilityStart + 1);
        const utility = css.slice(
          utilityStart,
          nextUtility === -1 ? undefined : nextUtility,
        );
        expect(utilityStart).toBeGreaterThanOrEqual(0);
        expect(utility).toContain('@media (max-width: 1023.98px)');
        expect(utility).toContain('font-size: 13px');
        expect(utility).toContain('line-height: 20px');
      }
    }
    for (const [size, weights] of [
      [14, ['r', 'm', 'sb', 'b']],
      [15, ['r', 'm', 'b']],
    ] as const) {
      for (const weight of weights) {
        const utilityStart = css.indexOf(
          `@utility font-designer-${size}${weight} {`,
        );
        const nextUtility = css.indexOf('@utility ', utilityStart + 1);
        const utility = css.slice(
          utilityStart,
          nextUtility === -1 ? undefined : nextUtility,
        );
        expect(utilityStart).toBeGreaterThanOrEqual(0);
        expect(utility).toContain('@media (max-width: 1023.98px)');
        expect(utility).toContain('font-size: 16px');
        expect(utility).toContain('line-height: 25px');
      }
    }
    expect(css).not.toContain('[class*=');
    expect(css).not.toContain('main a[href]');
    expect(css).not.toContain(':where(header, nav, main)');
  });

  it('MOB-TYPO-002 금지된 7.5·9·10~13px 임의 글자값과 text-xs를 거절한다', () => {
    const bannedToken =
      /text-\[(?:7\.5|9|10(?:\.5)?|11(?:\.5)?|12(?:\.5)?|13)px\]|text-xs\b/g;
    const violations = collectSourceFiles(join(projectRoot, 'src')).flatMap(
      (path) => {
        if (path.endsWith('/src/app/global.css')) return [];
        return readFileSync(path, 'utf8')
          .split('\n')
          .flatMap((line, index) => {
            const matches = line.match(bannedToken) ?? [];
            if (line.includes('max-lg:text-[13px]')) return [];
            return matches.map((match) => `${path}:${index + 1}:${match}`);
          });
      },
    );

    expect(violations).toEqual([]);
  });

  it('MOB-TYPO-003 인사이트 섬 라벨은 모바일 최저 12단계 토큰을 사용한다', () => {
    const insightFiles = collectSourceFiles(
      join(projectRoot, 'src/app/(service)/insights/ui'),
    );
    const violations = insightFiles.flatMap((path) => {
      const matches =
        readFileSync(path, 'utf8').match(/font-designer-(?:10|11)[rmb]?\b/g) ??
        [];
      return matches.map((match) => `${path}:${match}`);
    });

    expect(violations).toEqual([]);
  });

  it('MOB-TYPO-004 인사이트 모바일 글자는 13px 미만 선언을 모두 거절한다', () => {
    const css = readSource(
      'src/app/(service)/insights/ui/sprint8-insights.module.css',
    );
    const learningMap = readSource(
      'src/components/insights/insight-learning-map.tsx',
    );
    const root = postcss.parse(css);
    const baseSelectors = new Set<string>();
    const mobileSelectors = new Set<string>();

    root.walkDecls('font-size', (declaration) => {
      const size = Number.parseFloat(declaration.value);
      const rule = declaration.parent;
      if (rule?.type !== 'rule') return;

      const media = rule.parent;
      if (!media || media.type === 'root') {
        if (declaration.value.endsWith('px') && size < 13) {
          rule.selectors.forEach((selector) => {
            baseSelectors.add(selector);
          });
        }
        return;
      }

      if (media.type === 'atrule' && media.name === 'media') {
        if (
          /\(max-width:\s*(?:767|1023)px\)/.test(media.params) &&
          (size >= 13 || declaration.value === 'var(--spacing-160)')
        ) {
          rule.selectors.forEach((selector) => {
            mobileSelectors.add(selector);
          });
        }
      }
    });

    const roleTokenOverrides = new Set<string>();
    if (learningMap.includes("styles.stageLabel, 'font-designer-13b'")) {
      roleTokenOverrides.add('.stageLabel');
    }

    expect(
      [...baseSelectors].filter(
        (selector) =>
          !mobileSelectors.has(selector) && !roleTokenOverrides.has(selector),
      ),
    ).toEqual([]);
  });

  it('MOB-TYPO-005 인사이트 모바일 지도 재배치는 768px 미만에만 격리한다', () => {
    const css = readSource(
      'src/app/(service)/insights/ui/sprint8-insights.module.css',
    );
    const root = postcss.parse(css);
    const desktop = root.nodes.find(
      (node) =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params === '(min-width: 768px)',
    );
    const mobile = root.nodes.find(
      (node) =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params === '(max-width: 767px)',
    );

    expect(desktop?.toString()).toContain('font-size: 12px');
    const learningMap = readSource(
      'src/components/insights/insight-learning-map.tsx',
    );
    expect(learningMap).toMatch(
      /styles\.islandName,\s*'max-md:font-designer-13b'/,
    );
    expect(learningMap).toMatch(
      /styles\.islandSub,\s*'max-md:font-designer-13b'/,
    );
    const layoutSelectors = new Set<string>();
    if (mobile?.type === 'atrule') {
      mobile.walkDecls((declaration) => {
        if (
          /^(?:top|left|right|bottom|width|height|transform)$/.test(
            declaration.prop,
          )
        ) {
          const rule = declaration.parent;
          if (rule?.type === 'rule') {
            rule.selectors.forEach((selector) => {
              layoutSelectors.add(selector);
            });
          }
        }
      });
    }
    expect([...layoutSelectors]).toEqual(
      expect.arrayContaining([
        '.seaStage',
        '.stageInner',
        '.map',
        '.map > .island',
        '.map > .island:nth-of-type(n)',
        '.map .islandArt',
      ]),
    );
    expect(mobile?.toString()).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr))',
    );
  });

  it('MOB-TOUCH-001 공통 터치 대상은 모바일 44px와 비활성 제외 눌림 상태를 가진다', () => {
    const css = readSource('src/app/global.css');
    const button = readSource('src/components/common/ui/button/index.tsx');
    const iconButton = readSource('src/components/common/ui/icon-button.tsx');
    const tabs = readSource('src/components/common/ui/tabs/index.tsx');
    const chipButton = readSource(
      'src/components/common/ui/chip/chip-button.tsx',
    );

    for (const source of [button, iconButton, tabs, chipButton]) {
      expect(source).toContain('max-lg:min-h-550');
    }
    expect(button).toContain('max-lg:min-w-550');
    expect(iconButton).toContain('max-lg:min-w-550');
    expect(chipButton).toContain('max-lg:min-w-550');
    expect(css).toContain('@media (hover: none) and (max-width: 1023.98px)');
    expect(css).toContain('opacity: 0.72');
    expect(css).toContain(':not(:disabled)');
    expect(css).toContain(':not([aria-disabled="true"])');
    expect(css).toContain('transition-duration: 0ms');
  });

  it('MOB-TOUCH-002 홈 방·헤더 메뉴·로고 링크는 모바일 44px 높이를 가진다', () => {
    const homeFeed = readSource('src/components/retention/home-feed.tsx');
    const homeFeedCard = readSource(
      'src/components/common/cards/home-feed-card.tsx',
    );
    const mobileMenu = readSource(
      'src/components/common/layout/mobile-menu-drawer.tsx',
    );
    const headerNav = readSource('src/components/common/layout/header-nav.tsx');
    const footer = readSource('src/components/common/layout/footer.tsx');

    expect(homeFeed).toMatch(
      /href=\{getCommunityHref\(item\)\}[\s\S]{0,160}max-lg:min-h-550/,
    );
    expect(homeFeedCard).toMatch(
      /href=\{data\.roomHref\}[\s\S]{0,180}max-lg:min-h-550/,
    );
    expect(headerNav.match(/max-lg:min-h-550/g)).toHaveLength(2);
    for (const source of [mobileMenu, footer]) {
      expect(source).toMatch(
        /aria-label="홈"[\s\S]{0,100}inline-flex min-h-550[^"\n]*items-center/,
      );
    }
  });

  it('MOB-TOUCH-003 텍스트 액션 버튼은 눌림 피드백을 주고 비활성 입력은 거절한다', () => {
    const textActionButton = readSource(
      'src/components/common/ui/text-action-button.tsx',
    );

    expect(textActionButton).toContain('active:opacity-[.72]');
    expect(textActionButton).toContain('disabled:active:opacity-100');
  });

  it('MOB-FLOAT-001 서비스 본문은 플로팅 높이와 안전영역만큼 하단을 비운다', () => {
    const css = readSource('src/app/global.css');
    const serviceLayout = readSource('src/app/(service)/layout.tsx');

    expect(serviceLayout).toContain('mobile-floating-clearance');
    // 단일 source of truth: --floating-clearance 하나로 정의하고
    // .mobile-floating-clearance / .mobile-floating-clearance.pb-tabbar
    // 둘 다 그 변수만 참조한다(리뷰 반려 2026-09-26 MINOR 3 — 이전엔 72px
    // 공식이 두 규칙에 리터럴로 중복돼 있었다).
    // --tabbar-height(57px = 56 + border-t 1px)를 쓴다. --spacing-700(56px)
    // 단독이면 탭바 실측 높이보다 1px 모자라 겹침이 생긴다(독립 리뷰
    // 2026-09-26 재반려 실측 1 — --floating-clearance/pb-tabbar 등 탭바
    // 높이를 쓰는 모든 공식을 --tabbar-height로 통일했다).
    expect(css).toMatch(
      /--tabbar-height:\s*calc\(\s*var\(--spacing-700\)\s*\+\s*1px\s*\)/,
    );
    expect(css).toMatch(
      /--floating-clearance:\s*calc\(\s*var\(--tabbar-height\)\s*\+\s*var\(--spacing-200\)\s*\+\s*var\(--sat-b\)\s*\)/,
    );
    expect(css).toMatch(
      /\.mobile-floating-clearance\s*\{\s*padding-bottom:\s*var\(--floating-clearance\);/,
    );
    expect(css).toMatch(
      /\.mobile-floating-clearance\.pb-tabbar\s*\{\s*padding-bottom:\s*var\(--floating-clearance\);/,
    );
  });

  it('MOB-FLOAT-002 카카오/유틸 로우는 relative 모드에서 탭바 높이만큼 하단 여백을 갖는다', () => {
    const css = readSource('src/app/global.css');
    const fab = readSource(
      'src/components/common/ui/floating-class-action-buttons.tsx',
    );

    // MAJOR 1 (리뷰 반려 2026-09-26, 재반려 실측 1·2): community-responsive·
    // sprint8-responsive·sprint8-flow는 relative 로우라 <main>의 pb-tabbar가
    // 보호 못 하므로 로우 자체에 별도 클래스로 탭바 높이(--tabbar-height)
    // +safe-area 여백을 준다. **margin-bottom**을 쓴다(padding-bottom은
    // 이 로우의 기존 py-250 20px 패딩을 같은 우선순위로 덮어써 없앴고, 그
    // 결과 56px만 남아 실제 탭바 57px과 1px 겹쳤다 — 실측 재현·교정
    // 완료). 또한 **768px 이상용 unlayered 기본값을 두지 않는다**(이전
    // `.service-utility-row-clearance { padding-bottom: 0 }` 가 unlayered라
    // 항상 Tailwind py-250을 이겨 desktop 로우 높이가 96→76px로 줄어드는
    // 회귀를 냈다 — 실측 재현·교정 완료). 미디어쿼리 밖에는 이 클래스의
    // 선언이 아예 없어야 한다.
    expect(fab).toContain('service-utility-row-clearance');
    expect(fab).not.toContain('bottom-1000');
    expect(css).toMatch(
      /@media \(max-width: 767px\) \{\s*\.service-utility-row-clearance\s*\{\s*margin-bottom:\s*calc\(var\(--tabbar-height\)\s*\+\s*var\(--sat-b\)\)/,
    );
    expect(css).not.toMatch(
      /\.service-utility-row-clearance\s*\{\s*padding-bottom:\s*0/,
    );
  });
});
