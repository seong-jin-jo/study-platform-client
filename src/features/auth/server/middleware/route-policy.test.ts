import { describe, expect, it } from 'vitest';
import { ROUTE_POLICY_KINDS, resolveRoutePolicy } from './route-policy';

describe('retention route policy', () => {
  it('PWA-AUTH-001 기존 오프라인 안내 경로만 인증 없이 직접 연다', () => {
    expect(resolveRoutePolicy('/offline')).toBe(ROUTE_POLICY_KINDS.BYPASS);
    expect(resolveRoutePolicy('/offline/extra')).toBeUndefined();
  });

  it('keeps the public feed and search discovery paths public', () => {
    expect(resolveRoutePolicy('/')).toBe(ROUTE_POLICY_KINDS.PUBLIC_SESSION);
    expect(resolveRoutePolicy('/home')).toBe(ROUTE_POLICY_KINDS.PUBLIC_SESSION);
    expect(resolveRoutePolicy('/search')).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
    expect(resolveRoutePolicy('/search/results')).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
  });

  it('leaves exact public SEO routes to the earlier fail-closed branch', () => {
    expect(resolveRoutePolicy('/insights/koans/42')).toBeUndefined();
    expect(resolveRoutePolicy('/community/questions/42')).toBeUndefined();
  });

  it('allows anonymous seminar QR landings and the retention authentication start screen', () => {
    expect(resolveRoutePolicy('/seminar/sprint7')).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
    expect(resolveRoutePolicy('/onboarding/retention')).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
  });

  it('does not make other onboarding routes public by prefix', () => {
    expect(resolveRoutePolicy('/onboarding/retention/extra')).toBeUndefined();
  });

  it('ACCOUNT-DELETE-004 계정 삭제 안내만 exact 공개하고 하위 경로는 보호한다', () => {
    expect(resolveRoutePolicy('/account/delete')).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
    expect(resolveRoutePolicy('/account/delete/extra')).toBeUndefined();
  });

  it("UPDATES-001 업데이트 소식만 exact 공개하고 하위 경로는 보호한다", () => {
    expect(resolveRoutePolicy("/updates")).toBe(
      ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    );
    expect(resolveRoutePolicy("/updates/extra")).toBeUndefined();
    // 규칙이 PREFIX 로 바뀌면 이름만 비슷한 경로까지 공개되므로 그 회귀를 잡는다.
    expect(resolveRoutePolicy("/updatesX")).toBeUndefined();
    expect(resolveRoutePolicy("/updates-archive")).toBeUndefined();
  });

  it('keeps public SEO negative routes out of broad public prefixes', () => {
    expect(resolveRoutePolicy('/insights/x/progress')).toBeUndefined();
    expect(resolveRoutePolicy('/community/write')).toBeUndefined();
    expect(resolveRoutePolicy('/community/91/edit')).toBeUndefined();
    expect(resolveRoutePolicy('/home/extra')).toBeUndefined();
  });
});
