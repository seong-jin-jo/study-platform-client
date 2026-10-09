# Architecture

## Routing (Next.js App Router)

- `src/app/(landing)/` — public landing page (`/`)
- `src/app/(service)/` — authenticated service pages (home, my-page, payment, premium-study, etc.)
- `src/app/(admin)/` — admin pages (protected by `ROLE_ADMIN` claim in JWT)
- `src/middleware.ts` — validates accessToken cookie, auto-refreshes via `/api/v1/auth/access-token/refresh`, checks admin permissions for `/admin/*` paths

## API Layer

**Backend API docs:**

- Staging: https://test-api.zeroone.it.kr/v3/api-docs
- Swagger UI: https://test-api.zeroone.it.kr/swagger-ui/index.html

Two communication patterns coexist:

1. **Legacy axios** (`src/api/client/axios.ts`): baseURL `/api/v1/`, token refresh queue on AUTH001 error. Used for custom endpoints.
2. **OpenAPI auto-generated** (`src/api/openapi/`): Never modify — regenerated from Swagger. ESLint-excluded.

Add a new API hook:

```bash
yarn generate:api <swagger-api-title-name>
# Creates src/hooks/queries/<name>.ts (with createApiInstance boilerplate)
```

## State Management

- **Zustand** (`src/stores/`): Global client state. `useUserStore` (persist), `useLeaderStore`.
- **TanStack Query** (`src/hooks/queries/`): Server state. Default staleTime: 60 seconds.
- **React Hook Form + Zod** (`src/types/schemas/`): Form state + runtime validation.

## Component Structure

- Shared UI: `src/components/common/ui/` — `Button`, `Dialog`, `Toast`, `FloatingInquiryButton`
- Shared layouts: `src/components/common/layout/` — `Header`, `AdminSideBar`
- Shared modals: `src/components/common/modals/`
- Route views (page-level composites): `src/components/<domain>/pages/` (e.g. `home/pages/`). No top-level `components/pages/` — route views live under their domain.
- Domain composites: `class/`, `landing/`, `payment/`, `discussion/`, `archive/`, `balance-game/`, `mentoring/`

## Folder Structure Policy (Type-Based)

- **Target architecture: type-based layers.** New code goes in `components/<domain>/`, `hooks/queries/<domain>/`, `types/<domain>/`, `api/endpoints/<domain>/`.
- **`src/features/` is frozen legacy** — no new files. Migrate incrementally, exactly one domain per PR. Do not mix structures within a single PR.
- `yarn generate:api` scaffolding into `src/hooks/queries/` matches the target structure.
- Canonical domain name is `one-to-one`; `types/one-to-one-study` will be unified to `one-to-one` in its future migration PR (decision recorded 2026-06-11, rename deferred).

## Auth Flow

1. OAuth (Kakao/Google) → server issues JWT access + refresh tokens
2. `accessToken` in JS-accessible cookie; `refresh_token` in httpOnly cookie
3. Axios interceptor: AUTH001 → refresh → retry (queue prevents duplicate refreshes)
4. Middleware validates token server-side, redirects to `/` if invalid

## Path Aliases

`@/*` → `./src/*` (tsconfig.json)

## Environment Variables

Key `NEXT_PUBLIC_*` variables:

- `NEXT_PUBLIC_API_BASE_URL` — backend API endpoint
- `NEXT_PUBLIC_KAKAO_CLIENT_ID` — Kakao OAuth
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — Toss Payments
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity
- `NEXT_PUBLIC_GTM_ID` — Google Tag Manager
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN (disabled if absent)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — CI source map upload
