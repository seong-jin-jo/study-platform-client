import { describe, expect, it, vi } from 'vitest';
import { CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES } from '@/api/client/auth-session-refresh';
import {
  createSingleFlightPublicAuthBootstrap,
  PUBLIC_AUTH_BOOTSTRAP_STATES,
} from './public-auth-bootstrap-state';

describe('public document auth bootstrap', () => {
  it('uses a readable access token without probing refresh', async () => {
    const refresh = vi.fn();
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => 'readable-token',
      refresh,
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shares one refresh probe across every consumer in a document', async () => {
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
    });
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
    );

    await expect(
      Promise.all([bootstrap(), bootstrap(), bootstrap()]),
    ).resolves.toEqual([
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('settles an invalid refresh as anonymous without retrying, and marks it confirmed', async () => {
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID,
    });
    const markConfirmedAnonymous = vi.fn();
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      () => false,
      markConfirmedAnonymous,
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.ANONYMOUS,
    );
    await bootstrap();
    expect(refresh).toHaveBeenCalledOnce();
    expect(markConfirmedAnonymous).toHaveBeenCalledOnce();
  });

  it('settles a failed request as degraded without retrying', async () => {
    const state = CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED;
    const refresh = vi.fn().mockResolvedValue({ state });
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.DEGRADED,
    );
    await bootstrap();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('case 1: no marker, storage healthy, refresh_token still valid (pre-deploy existing user) keeps the login alive', async () => {
    // "모름" 상태(마커 없음)는 refresh 를 쳐본다. 배포 직후 기존 로그인
    // 사용자가 여기 해당한다. refresh_token 은 여전히 유효하므로 성공해야
    // 로그아웃되지 않는다.
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
    });
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      () => false, // shouldSkipRefreshProbe: 마커 없음 = 모름 = 건너뛰지 않음
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('case 2: no marker, storage healthy, no refresh_token (genuine first-time visitor) probes refresh at most once', async () => {
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID,
    });
    const markConfirmedAnonymous = vi.fn();
    let confirmedAnonymous = false;
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      () => confirmedAnonymous,
      () => {
        confirmedAnonymous = true;
        markConfirmedAnonymous();
      },
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.ANONYMOUS,
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(markConfirmedAnonymous).toHaveBeenCalledOnce();

    // 같은 방문자가 다시 부트스트랩을 만들어도(다음 페이지 로드 시뮬레이션)
    // 이번엔 confirmed-anonymous 마커가 있어 refresh 를 다시 치지 않는다.
    const nextLoadBootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      () => confirmedAnonymous,
      markConfirmedAnonymous,
    );
    await expect(nextLoadBootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.ANONYMOUS,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('case 3: storage access throws, refresh_token still valid, keeps the login alive', async () => {
    // storage 가 막힌 환경(Safari 사생활 보호 모드 등)에서 shouldSkipRefreshProbe
    // 는 false 를 반환해야 한다(주석과 동작이 어긋나면 안 된다. "보수적"은
    // "갱신을 쳐본다"는 뜻이지 "안 친다"가 아니다).
    const throwingShouldSkip = () => {
      throw new Error('storage blocked');
    };
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
    });

    // createSingleFlightPublicAuthBootstrap 자체는 shouldSkipRefreshProbe 를
    // 그대로 호출하므로, 실제 프로덕션 함수(hasClientSessionConfirmedAnonymous)
    // 가 하는 것처럼 예외를 여기서 삼켜 false 를 반환하는 wrapper 를 써서
    // "storage 예외 → 프로브를 친다" 계약을 검증한다.
    const shouldSkipRefreshProbe = () => {
      try {
        return throwingShouldSkip();
      } catch {
        return false;
      }
    };

    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      shouldSkipRefreshProbe,
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('case 4: confirmed-anonymous marker present, accessToken expired, still probes refresh (regression)', async () => {
    const refresh = vi.fn().mockResolvedValue({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
    });
    const bootstrap = createSingleFlightPublicAuthBootstrap(
      () => undefined,
      refresh,
      () => false, // no confirmed-anonymous marker -> do not skip
    );

    await expect(bootstrap()).resolves.toBe(
      PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});
