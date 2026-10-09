import axios from 'axios';
import {
  attachAccessTokenToRequest,
  createClientAuthResponseRejectedHandler,
} from '@/api/client/auth-response-interceptor';
import { attachApiLogger } from './api-logger';
import { IS_APPINTOSS_RUNTIME } from './appintoss-public-api';

// * client-side axios 인스턴스

// json 요청
export const axiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: !IS_APPINTOSS_RUNTIME,
});

// multipart 요청용
export const axiosInstanceForMultipart = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/`,
  timeout: 60000, // 파일 업로드 전용 — 클라이언트→백엔드 전송 + 백엔드→S3 처리 여유
  headers: {
    // JS에서 formData 를 넘길땐 Content-Type 생략해야 자동으로 multipart/form-data + boundary 설정됨
  },
});

attachApiLogger(axiosInstance, 'client-json');
attachApiLogger(axiosInstanceForMultipart, 'client-multipart');

if (!IS_APPINTOSS_RUNTIME) {
  axiosInstance.interceptors.request.use(attachAccessTokenToRequest);
  axiosInstanceForMultipart.interceptors.request.use(
    attachAccessTokenToRequest,
  );

  axiosInstance.interceptors.response.use(
    (config) => config,
    createClientAuthResponseRejectedHandler((requestConfig) =>
      axiosInstance(requestConfig),
    ),
  );

  // multipart 요청용 인터셉터도 동일하게 적용
  axiosInstanceForMultipart.interceptors.response.use(
    (config) => config,
    createClientAuthResponseRejectedHandler((requestConfig) =>
      axiosInstanceForMultipart(requestConfig),
    ),
  );
}

// v5 Class API 전용 인스턴스
export const axiosInstanceV5 = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v5/`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: !IS_APPINTOSS_RUNTIME,
});

export const axiosInstanceForMultipartV5 = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v5/`,
  timeout: 60000,
  headers: {},
  withCredentials: !IS_APPINTOSS_RUNTIME,
});

attachApiLogger(axiosInstanceV5, 'client-v5-json');
attachApiLogger(axiosInstanceForMultipartV5, 'client-v5-multipart');
if (!IS_APPINTOSS_RUNTIME) {
  axiosInstanceV5.interceptors.request.use(attachAccessTokenToRequest);
  axiosInstanceForMultipartV5.interceptors.request.use(
    attachAccessTokenToRequest,
  );
  axiosInstanceV5.interceptors.response.use(
    (config) => config,
    createClientAuthResponseRejectedHandler((requestConfig) =>
      axiosInstanceV5(requestConfig),
    ),
  );
  axiosInstanceForMultipartV5.interceptors.response.use(
    (config) => config,
    createClientAuthResponseRejectedHandler((requestConfig) =>
      axiosInstanceForMultipartV5(requestConfig),
    ),
  );
}

// v6 MyPage API 전용 인스턴스
export const axiosInstanceV6 = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v6/`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: !IS_APPINTOSS_RUNTIME,
});

attachApiLogger(axiosInstanceV6, 'client-v6-json');
if (!IS_APPINTOSS_RUNTIME) {
  axiosInstanceV6.interceptors.request.use(attachAccessTokenToRequest);
  axiosInstanceV6.interceptors.response.use(
    (config) => config,
    createClientAuthResponseRejectedHandler((requestConfig) =>
      axiosInstanceV6(requestConfig),
    ),
  );
}
