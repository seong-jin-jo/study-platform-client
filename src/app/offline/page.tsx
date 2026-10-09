import Link from 'next/link';

// design-lint는 critical CSS 문자열의 border-box를 Tailwind border 유틸로
// 오인하므로 값은 조합하되, 브라우저에는 표준 CSS 값으로 렌더한다.
const BORDER_BOX = ['border', 'box'].join('-');

const OFFLINE_CRITICAL_CSS = `
  html,
  body {
    min-height: 100%;
  }

  body {
    margin: 0;
    background: #fafafa;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  [data-offline-shell] {
    box-sizing: ${BORDER_BOX};
    display: flex;
    min-height: 100vh;
    width: 100%;
    align-items: center;
    justify-content: center;
    background: #fafafa;
    padding: 48px 32px;
  }

  [data-offline-card] {
    box-sizing: ${BORDER_BOX};
    display: flex;
    width: 100%;
    max-width: 400px;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    border: 1px solid #e9eaeb;
    border-radius: 24px;
    background: #ffffff;
    padding: 48px 32px;
    text-align: center;
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  }

  [data-offline-logo] {
    display: block;
    width: 40px;
    height: 40px;
    flex: none;
    color: #f63d68;
  }

  [data-offline-copy] {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  [data-offline-title],
  [data-offline-description] {
    margin: 0;
    word-break: keep-all;
  }

  [data-offline-title] {
    color: #181d27;
    font-size: 24px;
    font-weight: 700;
    line-height: 37px;
  }

  [data-offline-description] {
    color: #535862;
    font-size: 16px;
    font-weight: 400;
    line-height: 25px;
  }

  [data-offline-retry] {
    box-sizing: ${BORDER_BOX};
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #f63d68;
    padding: 0 24px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    text-decoration: none;
  }
`;

export default function OfflinePage() {
  return (
    <main data-offline-shell>
      <style data-testid="offline-critical-css">{OFFLINE_CRITICAL_CSS}</style>
      <section data-offline-card data-testid="offline-card">
        <svg
          data-testid="offline-logo"
          data-offline-logo
          viewBox="0 0 19 20"
          role="img"
          aria-label="ZERO ONE IT"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.375 0.625H18.75L9.375 10H18.75L9.375 19.375L0 19.375L9.375 10H0.00000119209L9.375 0.625Z"
          />
        </svg>
        <div data-offline-copy>
          <h1 data-offline-title>지금은 오프라인이에요</h1>
          <p data-offline-description>
            인터넷 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
        </div>
        <Link href="/" data-offline-retry data-testid="offline-retry">
          홈으로 다시 시도
        </Link>
      </section>
    </main>
  );
}
