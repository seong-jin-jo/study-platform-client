import type { ReleaseNote } from './release-notes';
import { trackWhatsNewView } from './whats-new-events';

/** 마지막으로 본(또는 닫은) 버전을 저장하는 브라우저 저장소 키 */
export const WHATS_NEW_LAST_SEEN_KEY = 'zo_last_seen_version';

/** 첫 방문 안내·다른 모달이 먼저 자리를 잡도록 카드를 늦게 띄우는 시간(ms) */
export const WHATS_NEW_SHOW_DELAY_MS = 1200;

// 이 경로들에서는 카드를 띄우지 않는다. 로그인·가입 복귀, 온보딩, 결제 흐름은
// 이탈 방지가 필요한 화면이고(mobile-tab-bar.tsx 의 흐름 경로 규칙과 같은 기준),
// /redirection 은 소셜 로그인 복귀 화면, /offline 은 오프라인 안내다.
const SUPPRESSED_PATH_PREFIXES = [
  '/login',
  '/sign-up',
  '/redirection',
  '/onboarding',
  '/payment',
  '/admin',
  '/offline',
  '/updates',
  '/account/delete',
] as const;
const CLASS_PAYMENT_FLOW_PATTERN = /^\/class\/[^/]+\/payment(\/|$)/;

export const isWhatsNewSuppressedPath = (pathname: string): boolean =>
  SUPPRESSED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) || CLASS_PAYMENT_FLOW_PATTERN.test(pathname);

interface ShouldShowParams {
  latest: ReleaseNote | undefined;
  lastSeenVersion: string | undefined;
  pathname: string;
  /** 온보딩 모달 등 다른 전면 흐름이 열려 있으면 카드를 미룬다 */
  isBlockedByOtherFlow: boolean;
}

/**
 * 카드 노출 조건: 최신 항목이 notify:true 이고, 저장된 버전과 다르며,
 * 흐름 화면이 아니고, 다른 흐름이 열려 있지 않을 때만.
 */
export const shouldShowWhatsNewCard = ({
  latest,
  lastSeenVersion,
  pathname,
  isBlockedByOtherFlow,
}: ShouldShowParams): boolean =>
  Boolean(latest) &&
  latest?.notify === true &&
  latest.version !== lastSeenVersion &&
  !isWhatsNewSuppressedPath(pathname) &&
  !isBlockedByOtherFlow;

// 저장소가 막힌 환경(사생활 보호 모드 등)에서는 읽기·쓰기가 던진다.
// 그때는 "저장 안 됨"으로 보고 화면이 깨지지 않게 한다.
export const readLastSeenVersion = (): string | undefined => {
  try {
    return window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

export const writeLastSeenVersion = (version: string): void => {
  try {
    window.localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, version);
  } catch {
    // 저장 실패는 무시한다. 다음 방문에 카드가 한 번 더 뜰 뿐이다.
  }
};

/** 의견 남기기로 보내는 기존 문의 작성 화면 경로 */
export const buildFeedbackHref = (version: string): string =>
  `/my-inquiry/write?whats_new=${encodeURIComponent(version)}`;

/**
 * 카드가 실제로 보인 순간에 부른다: 이벤트를 보내고 그 버전을 "봤다"고 저장한다.
 * 카드 문구가 "한 번만 알려 드립니다"이므로, 아무것도 안 누르고 떠나도 다음 접속에는 뜨지 않는다.
 * (이전에는 닫기·버튼을 눌러야만 저장돼서 무시한 사람에게 매번 다시 떴다.)
 */
export const recordWhatsNewShown = (version: string): void => {
  trackWhatsNewView(version);
  writeLastSeenVersion(version);
};
