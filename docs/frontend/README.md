# Frontend docs

`docs/frontend/`는 `study-platform-client`의 frontend 구현, UI/UX, API 사용, Storybook/Playwright 운영 문서를 둔다.

## PWA 서비스워커 운영과 킬스위치

- 등록: `src/components/pwa/pwa-runtime.tsx`가 production 빌드에서만 `/sw.js`를 scope `/`로 등록한다.
- 오프라인: `public/sw.js`는 `/offline` 문서와 그 문서가 참조하는 동일 출처 `/_next/static/` CSS·폰트를 install 시 미리 저장한다. 문서 내비게이션은 network-first이며 네트워크 실패 때만 오프라인 페이지를 반환한다.
- 정적 파일: 같은 출처의 `/_next/static/*`만 cache-first로 저장한다. API, 인증, 결제, 일반 HTML 응답은 런타임 캐시에 넣지 않는다.
- 문서 MIME: 미들웨어가 본문 없는 400·404를 만들지 않으며, 서비스워커도 Content-Type 없는 내비게이션 응답을 원래 상태코드를 유지한 HTML 응답으로 정규화한다. 이 방어는 폐기 경로가 파일 다운로드로 열리는 Chrome 동작을 막는다.
- 버전 교체: `yarn build`가 `GITHUB_SHA`, 명시한 `NEXT_PUBLIC_PWA_CACHE_VERSION`, 또는 임의 UUID를 빌드에 주입한다. 서비스워커 URL과 캐시 이름이 이 값을 공유하고 activate 단계가 `zeroone-pwa-` 접두사의 이전 캐시만 삭제한다.
- 내비게이션 preload: activate에서 preload를 활성화하고 내비게이션 fetch에서 `preloadResponse`를 먼저 사용한다. 지원하지 않는 브라우저는 기존 network-first 경로를 사용한다.

긴급 해제 시 `NEXT_PUBLIC_PWA_SW_ENABLED=false`를 **빌드 전에** `.env` 또는 이미지 빌드 환경에 넣어 새 이미지를 만들고, 같은 배포에서 `public/sw.js`를 아래 내용으로 바꾼다. `NEXT_PUBLIC_*` 값은 Next 빌드 산출물에 인라인되므로 런타임 환경 변수만 바꾸면 등록이 멈추지 않는다. 환경 변수는 새 클라이언트의 재등록을 막고, 기존 서비스워커는 새 파일을 설치한 뒤 등록과 `zeroone-pwa-` 캐시를 지우고 열린 클라이언트를 새로고침한다. 해제 배포가 전체 사용자에게 도달한 것을 확인하기 전에는 파일을 삭제하거나 404로 만들지 않는다. 복구할 때는 원래 `sw.js`와 `NEXT_PUBLIC_PWA_SW_ENABLED=true`를 배포한다. 새 build가 자동으로 새 캐시 버전을 주입한다.

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('zeroone-pwa-'))
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) client.navigate(client.url);
      }),
    ]),
  );
});
```

제품 요구사항의 canonical source는 `docs/product-ssot/`이며, 이 디렉터리는 그 요구사항을 frontend가 어떻게 소비하는지 설명한다.

## 넣는 문서

- frontend API 사용 정책
- `src/api/openapi/` generated client 사용 규칙
- custom axios endpoint와 generated OpenAPI의 차이
- auth client session, middleware, redirect UX
- UI pattern, component pattern, Storybook 운영
- Playwright 시나리오와 화면 검증 방법

## 넣지 않는 문서

- backend DB/Flyway/local runbook
- 제품 요구사항 원장
- release/rollback 운영 절차

## 현재 기준

- generated OpenAPI 파일인 `src/api/openapi/`는 직접 수정하지 않는다.
- 새 API 사용 전 실제 endpoint와 DTO를 backend Swagger 또는 `../study-platform-mvp`에서 확인한다.
- API contract와 연결되는 제품 요구사항은 `docs/product-ssot/{domain}/requirements.yaml`의 `REQ-*`로 연결한다.
