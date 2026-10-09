// 회장 지시(2026-09-17): "로딩바 티가 안 나. 절반쯤 내렸을 때 응원, 다
// 내렸을 때 컨페티". 이 파일은 순수 유틸이다(React 컴포넌트 아님) —
// article-v2-components.tsx 와 insight-article-actions.tsx 양쪽에서 쓰는데,
// 두 파일이 서로를 이미 import 하고 있어(article-v2-components →
// insight-article-actions, resolvePersonalArticleInteraction 등) 셀레브레이션
// 로직을 어느 한쪽에 얹으면 순환 import 가 생긴다. 그래서 따로 뺐다.
//
// 컨페티는 캔버스 라이브러리(canvas-confetti 등) 없이 CSS 파티클 30개로
// 직접 구현했다 — 번들 증가 0KB(새 의존성 없음). 60fps 를 못 낼 저사양
// 기기 걱정은 prefers-reduced-motion 존중 + 1.5초 내 자동 제거로 줄인다.

import { useToastStore } from '@/stores/use-toast-store';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// 세션당 1회만 통과시킨다. sessionStorage 가 막혀 있으면(프라이빗 모드 등)
// 매번 통과시킨다 — "아예 안 보여준다"보다 "한 세션에 여러 번 보일 수
// 있다"가 덜 나쁜 실패 모드라고 판단했다.
function sessionOnce(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

export function triggerHalfwayCelebration(
  documentId: string,
  note?: string,
): void {
  if (!sessionOnce(`zo:celebrated-half:${documentId}`)) return;
  useToastStore
    .getState()
    .showToast(
      note ?? '절반 왔어요. 오늘 꼭 봐야 할 절이 다가와요.',
      'success',
    );
}

const CONFETTI_COLORS = ['#f63d68', '#12b76a', '#fde68a', '#181d27', '#fff1f3'];
const CONFETTI_COUNT = 30;
const CONFETTI_LIFETIME_MS = 1600;

export function spawnConfetti(): void {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) return;

  const root = document.createElement('div');
  root.className = 'zo-confetti-root';
  root.setAttribute('data-testid', 'zo-confetti');
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';

  for (let i = 0; i < CONFETTI_COUNT; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'zo-confetti-particle';
    const left = Math.random() * 100;
    const delay = Math.random() * 0.3;
    const duration = 1 + Math.random() * 0.5;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    particle.style.cssText = `position:absolute;top:-10px;left:${left}%;width:8px;height:8px;background:${color};border-radius:2px;opacity:0.9;animation:zo-confetti-fall ${duration}s ease-in ${delay}s forwards;`;
    root.appendChild(particle);
  }

  const style = document.createElement('style');
  style.textContent =
    '@keyframes zo-confetti-fall{0%{transform:translateY(0) rotate(0deg);opacity:1;}100%{transform:translateY(100vh) rotate(360deg);opacity:0;}}';
  root.appendChild(style);

  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), CONFETTI_LIFETIME_MS);
}

// 완독(마지막 h2 지나 본문 끝 sentinel) 도달 시 호출한다. 기존
// markInsightRead/recordProgress 완료 토스트는 insight-article-actions.tsx
// 가 이미 낸다 — 여기서는 세션당 1회 컨페티만 더한다(토스트 중복 방지).
export function triggerReadCelebration(documentId: string): void {
  if (!sessionOnce(`zo:celebrated-full:${documentId}`)) return;
  spawnConfetti();
}
