import { defineConfig } from '@apps-in-toss/web-framework/config';

// TODO(app-release): 콘솔 등록 직전에 회장이 확정한 appName으로 환경변수를 고정한다.
const appName = process.env.APPS_IN_TOSS_APP_NAME ?? 'zeroone-it';

export default defineConfig({
  appName,
  brand: {
    primaryColor: '#f63d68',
  },
  navigationBar: {
    theme: 'light',
    withBackButton: true,
    withHomeButton: false,
    withTitle: false,
  },
  permissions: [],
  webBundleDir: '../out-appintoss',
  webView: {
    allowsBackForwardNavigationGestures: true,
    pullToRefreshEnabled: false,
  },
});
