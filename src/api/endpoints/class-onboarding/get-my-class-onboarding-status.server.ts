import { isAxiosError } from 'axios';
import { createApiServerInstance } from '@/api/client/open-api-instance.server';
import { unwrapContent } from '@/api/client/unwrap-content';
import type { ClassOnboardingStatusResponse } from '@/api/openapi';
import { ClassOnboardingApi } from '@/api/openapi';

const classOnboardingApi = createApiServerInstance(ClassOnboardingApi);

export const SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS = {
  SUCCESS: 'success',
  AUTH_ERROR: 'auth-error',
  NOT_FOUND: 'not-found',
  REQUEST_FAILED: 'request-failed',
} as const;

export type ServerClassOnboardingStatusResult =
  | {
      kind: typeof SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.SUCCESS;
      status: ClassOnboardingStatusResponse;
    }
  | {
      kind: typeof SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.AUTH_ERROR;
      statusCode: 401 | 403;
      error: unknown;
    }
  | {
      kind: typeof SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.NOT_FOUND;
      statusCode: 404;
      error: unknown;
    }
  | {
      kind: typeof SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.REQUEST_FAILED;
      statusCode?: number;
      error: unknown;
    };

const classifyServerClassOnboardingStatusError = (
  error: unknown,
): Exclude<
  ServerClassOnboardingStatusResult,
  { kind: typeof SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.SUCCESS }
> => {
  if (!isAxiosError(error)) {
    return {
      kind: SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.REQUEST_FAILED,
      error,
    };
  }

  const statusCode = error.response?.status;

  if (statusCode === 401 || statusCode === 403) {
    return {
      kind: SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.AUTH_ERROR,
      statusCode,
      error,
    };
  }

  if (statusCode === 404) {
    return {
      kind: SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.NOT_FOUND,
      statusCode,
      error,
    };
  }

  return {
    kind: SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.REQUEST_FAILED,
    statusCode,
    error,
  };
};

export const getMyClassOnboardingStatusInServerResult =
  async (): Promise<ServerClassOnboardingStatusResult> => {
    try {
      const { data } = await classOnboardingApi.getMyOnboardingStatus();

      return {
        kind: SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.SUCCESS,
        status: unwrapContent(data),
      };
    } catch (error) {
      return classifyServerClassOnboardingStatusError(error);
    }
  };

export const tryGetMyClassOnboardingStatusInServer =
  getMyClassOnboardingStatusInServerResult;
