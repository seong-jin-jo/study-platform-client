import 'server-only';

import {
  getStrapiApiToken,
  getStrapiBaseUrl,
  isStrapiDraftMode,
} from '@/api/strapi/config/strapi-config';

// 공통 응답 타입 (flat 구조용)
export interface StrapiCollectionResponse<T> {
  data: (T & { id: number; documentId: string })[]; // documentId 추가
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// 단일 아이템 응답 타입
export interface StrapiSingleResponse<T> {
  data: (T & { id: number; documentId: string }) | null;
  meta: object;
}

// 공통 fetch 함수
/**
 * Strapi 요청 URL 을 만든다. 개발 배포에서는 `status=draft` 를 붙인다.
 *
 * 이 조립을 함수 하나로 모은 이유가 있다. 예전에는 `strapiFetch` 안에만
 * draft 분기가 있었고, `strapiFetchNoStore` 는 문자열을 이어 붙여 URL 을
 * 만들면서 그 분기를 빠뜨렸다. 그런데 인사이트 **본문**을 가져오는 경로가
 * 하필 `strapiFetchNoStore` 였다. 그래서 dev 는 본문을 늘 published 로만
 * 조회했고, 시드가 넣은 39편 중 36편이 draft 라 전부 "찾을 수 없음" 이 되어
 * 화면에 "내용이 없습니다" 만 남았다(2026-08-21 dev 컨테이너 로그로 확인:
 * `Strapi article body not found: pthi4derh6yxnpam8di4c7o0`).
 * 두 함수가 URL 을 각자 만들면 같은 실수가 다시 난다. 그래서 한 곳으로 모은다.
 */
const buildStrapiUrl = (path: string) => {
  const parsed = new URL(path, `${getStrapiBaseUrl()}/`);
  if (isStrapiDraftMode()) {
    parsed.searchParams.set('status', 'draft');
  }
  return parsed.toString();
};

async function strapiFetch<T>(path: string): Promise<T> {
  const url = buildStrapiUrl(path);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getStrapiApiToken()}` },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(
      `Strapi fetch error: ${res.status} ${res.statusText} (${url})`,
    );
  }

  return (await res.json()) as T;
}

async function strapiFetchNoStore<T>(path: string): Promise<T> {
  const url = buildStrapiUrl(path);
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${getStrapiApiToken()}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(
      `Strapi fetch error: ${res.status} ${res.statusText} (${url})`,
    );
  }

  return (await res.json()) as T;
}

export { strapiFetch, strapiFetchNoStore };
