import type { InternalAxiosRequestConfig } from 'axios';

export const attachAccessTokenToRequest = (
  config: InternalAxiosRequestConfig,
) => config;

export const createClientAuthResponseRejectedHandler =
  (
    _retryRequest: (
      requestConfig: InternalAxiosRequestConfig,
    ) => Promise<unknown>,
  ) =>
  (error: unknown) =>
    Promise.reject(error);
