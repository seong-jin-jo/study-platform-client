import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeAccessTokenSession = vi.fn();
const readClientAuthGeneration = vi.fn(() => 0);

vi.mock('@/features/auth/model/client-auth-session', () => ({
  writeAccessTokenSession,
  readClientAuthGeneration,
}));

const loadAuthSessionRefresh = async () => import('./auth-session-refresh');

const createJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const createDeferred = <T>() => {
  let resolveDeferred!: (value: T | PromiseLike<T>) => void;
  let rejectDeferred!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
};

describe('refreshClientAuthSession', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    writeAccessTokenSession.mockReset();
    readClientAuthGeneration.mockReset();
    readClientAuthGeneration.mockReturnValue(0);
  });

  it('writes the refreshed access token and returns a success result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          statusCode: 201,
          content: {
            accessToken: 'renewed-access-token',
          },
        },
        201,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);
    writeAccessTokenSession.mockReturnValue('101');

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    await expect(refreshClientAuthSession()).resolves.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
      accessToken: 'renewed-access-token',
      memberId: '101',
    });
    expect(writeAccessTokenSession).toHaveBeenCalledWith(
      'renewed-access-token',
    );
  });

  it('returns invalid when the backend confirms the refresh token is no longer valid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          statusCode: 400,
          errorCode: 'AUTH004',
          errorName: 'INVALID_REFRESH_TOKEN',
          message: '지원하지 않는 리프레시 토큰입니다.',
        },
        400,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    await expect(refreshClientAuthSession()).resolves.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID,
    });
    expect(writeAccessTokenSession).not.toHaveBeenCalled();
  });

  it('treats malformed refresh responses as request failures instead of fabricating a session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          statusCode: 201,
          content: {},
        },
        201,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    await expect(refreshClientAuthSession()).resolves.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
    });
    expect(writeAccessTokenSession).not.toHaveBeenCalled();
  });

  it('차단결함2: does not report invalid when another tab logs in before the response arrives (generation mismatch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          statusCode: 400,
          errorCode: 'AUTH004',
          errorName: 'INVALID_REFRESH_TOKEN',
          message: '지원하지 않는 리프레시 토큰입니다.',
        },
        400,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    // 요청 시작 시점의 세대는 0. 응답이 도착할 무렵엔 다른 탭에서 로그인이
    // 성공해 세대가 1로 올라간 상황을 재현한다.
    let callCount = 0;
    readClientAuthGeneration.mockImplementation(() => {
      callCount += 1;

      return callCount === 1 ? 0 : 1;
    });

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    const result = await refreshClientAuthSession();

    expect(result.state).toBe(
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
    );
    expect(result).not.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID,
    });
  });

  it('수정권고1: does not treat a 5xx response body containing AUTH004 as invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          statusCode: 503,
          errorCode: 'AUTH004',
          errorName: 'INVALID_REFRESH_TOKEN',
          message: '일시적인 서버 오류입니다.',
        },
        503,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    const result = await refreshClientAuthSession();

    expect(result.state).toBe(
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
    );
    expect(writeAccessTokenSession).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent browser refresh attempts into one in-flight request', async () => {
    const deferredResponse = createDeferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(deferredResponse.promise);

    vi.stubGlobal('fetch', fetchMock);
    writeAccessTokenSession.mockReturnValue('101');

    const {
      refreshClientAuthSession,
      CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
    } = await loadAuthSessionRefresh();

    const firstRequest = refreshClientAuthSession();
    const secondRequest = refreshClientAuthSession();

    deferredResponse.resolve(
      createJsonResponse(
        {
          statusCode: 201,
          content: {
            accessToken: 'renewed-access-token',
          },
        },
        201,
      ),
    );

    await expect(firstRequest).resolves.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
      accessToken: 'renewed-access-token',
      memberId: '101',
    });
    await expect(secondRequest).resolves.toEqual({
      state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
      accessToken: 'renewed-access-token',
      memberId: '101',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
