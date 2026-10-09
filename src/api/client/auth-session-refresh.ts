import {
  readClientAuthGeneration,
  writeAccessTokenSession,
} from '@/features/auth/model/client-auth-session';
import { ApiError, isApiError } from './api-error';

export const CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES = {
  SUCCESS: 'success',
  INVALID: 'invalid',
  REQUEST_FAILED: 'request-failed',
} as const;

// 인증 거절 계열(4xx)일 때만 invalid 로 취급한다. 백엔드는 리프레시 토큰
// 무효를 401 이 아니라 400 + errorCode:AUTH004 로 응답한다(기존 계약).
// 5xx 응답 본문에 우연히 AUTH004 문자열이 들어 있어도(예: 프록시/게이트웨이가
// 장애 응답을 감싸는 경우) 그건 서버 일시 장애이지 리프레시 토큰이 무효라는
// 뜻이 아니므로, 세션을 무효로 확정하면 안 되고 일시 실패로 다뤄야 한다.
const isRefreshInvalidHttpStatus = (status: number): boolean =>
  status >= 400 && status < 500;

export type ClientAuthSessionRefreshResult =
  | {
      state: typeof CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS;
      accessToken: string;
      memberId?: string;
    }
  | { state: typeof CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID }
  | {
      state: typeof CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED;
      error?: unknown;
    };

interface RefreshAccessTokenResponseBody {
  content?: {
    accessToken?: unknown;
  };
}

const INVALID_REFRESH_ERROR_CODE = 'AUTH004';
const REFRESH_ACCESS_TOKEN_PATH = '/api/v1/auth/access-token/refresh';

let inFlightClientAuthRefresh:
  | Promise<ClientAuthSessionRefreshResult>
  | undefined;

const parseApiErrorResponse = async (
  response: Response,
): Promise<ApiError | undefined> => {
  try {
    const responseBody = await response.json();

    return isApiError(responseBody) ? new ApiError(responseBody) : undefined;
  } catch {
    return undefined;
  }
};

const parseAccessToken = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    const responseBody =
      (await response.json()) as RefreshAccessTokenResponseBody;
    const accessToken = responseBody.content?.accessToken;

    return typeof accessToken === 'string' && accessToken.trim().length > 0
      ? accessToken
      : undefined;
  } catch {
    return undefined;
  }
};

const createRefreshRequestUrl = (): string =>
  `${process.env.NEXT_PUBLIC_API_BASE_URL}${REFRESH_ACCESS_TOKEN_PATH}`;

const runClientAuthSessionRefresh =
  async (): Promise<ClientAuthSessionRefreshResult> => {
    // 요청을 시작하는 시점의 인증 세대를 기억해둔다. 이 요청이 진행되는
    // 동안 다른 탭에서 로그인이 성공하면 세대가 올라가고, 그 경우 이
    // 요청의 INVALID 응답은 낡은 것이므로 confirmed anonymous 로 확정하면
    // 안 된다(탭 간 경합).
    const startGeneration = readClientAuthGeneration();

    try {
      const response = await fetch(createRefreshRequestUrl(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const apiError = await parseApiErrorResponse(response);

        if (
          isRefreshInvalidHttpStatus(response.status) &&
          apiError?.errorCode === INVALID_REFRESH_ERROR_CODE
        ) {
          if (readClientAuthGeneration() !== startGeneration) {
            // 그 사이 다른 탭에서 로그인이 성공했다. 이 응답은 낡았으므로
            // 무효로 확정하지 않는다.
            return {
              state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
              error: apiError,
            };
          }

          return {
            state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID,
          };
        }

        return {
          state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
          error: apiError,
        };
      }

      const accessToken = await parseAccessToken(response);

      if (!accessToken) {
        return {
          state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
        };
      }

      return {
        state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS,
        accessToken,
        memberId: writeAccessTokenSession(accessToken),
      };
    } catch (error) {
      return {
        state: CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.REQUEST_FAILED,
        error,
      };
    }
  };

export const refreshClientAuthSession =
  async (): Promise<ClientAuthSessionRefreshResult> => {
    if (inFlightClientAuthRefresh) {
      return inFlightClientAuthRefresh;
    }

    const refreshPromise = runClientAuthSessionRefresh().finally(() => {
      inFlightClientAuthRefresh = undefined;
    });

    inFlightClientAuthRefresh = refreshPromise;

    return refreshPromise;
  };
