import { createHmac, timingSafeEqual } from 'node:crypto';
import { getCommunitySitemapResourcesInServer } from '@/api/endpoints/community/community-seo.server';
import { getPublicProfileSitemapResourcesInServer } from '@/api/endpoints/community/public-profile.server';
import { getInsightSitemapResourcesInServer } from './insight-seo.server';

const SITE_ORIGIN = 'https://www.zeroone.it.kr';
const MAX_URLS = 50_000;
const MAX_XML_BYTES = 50 * 1024 * 1024;
const PARTITION_SCHEMA_GENERATION_AT = '2026-08-16T00:00:00.000Z';

export const STATIC_SITEMAP_PATHS = [
  '/',
  '/home',
  '/insights',
  '/insights/koans',
  '/community',
] as const;

export interface SitemapResource {
  type:
    | 'STATIC'
    | 'ISLAND'
    | 'ARTICLE'
    | 'KOAN'
    | 'POST'
    | 'ROOM'
    | 'QUESTION'
    | 'PROFILE';
  key: string;
  canonicalPath: string;
  updatedAt: string;
}

interface PartitionPayload {
  v: 1;
  type: SitemapResource['type'];
  lowerExclusiveKey: string | null;
  upperInclusiveKey: string;
  generationAt: string;
}

const base64url = (value: Buffer | string) =>
  Buffer.from(value).toString('base64url');

// 이 시크릿은 사이트맵 분할 토큰(partition token)의 서명 키다. 토큰이 가리키는 것은
// 전부 공개 URL 목록이므로 기밀이 아니고, 서명은 임의 분할 요청을 막는 무결성 장치다.
// 그런데 production 에서 값이 없으면 throw 하도록 돼 있어서, 환경변수를 넣지 않은
// 배포 대상(현재 운영 프론트)에서는 /sitemap.xml 이 통째로 500/503 이 됐다.
// 색인 입구가 환경변수 하나 때문에 닫히는 쪽이 서명 키가 배포마다 바뀌는 쪽보다 나쁘다.
// 그래서 명시 시크릿 > NEXTAUTH_SECRET > 배포 식별자 파생값 순으로 내려간다.
// 배포 식별자 파생값은 한 배포 안에서는 고정이므로 그 배포가 발급한 토큰은 같은 배포에서
// 검증된다. 재배포 직후 구 토큰은 무효가 되는데, 크롤러는 색인 파일을 다시 받아
// 분할 링크를 새로 얻으므로 회복된다(payload 의 generationAt 도 이미 같은 성질이다).
const sitemapSecret = () => {
  const configured =
    process.env.SITEMAP_PARTITION_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') {
    return 'zero-one-local-sitemap-partition-secret';
  }
  const deploymentScoped =
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.ZEROONE_RELEASE_ID;
  if (deploymentScoped) {
    return `zero-one-sitemap-partition:${deploymentScoped}`;
  }
  throw new Error('SITEMAP_PARTITION_SECRET is required');
};

export const signPartition = (payload: PartitionPayload) => {
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', sitemapSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
};

export const verifyPartition = (
  token: string,
): PartitionPayload | undefined => {
  const [encoded, suppliedSignature, extra] = token.split('.');
  if (!encoded || !suppliedSignature || extra) return undefined;
  const expected = createHmac('sha256', sitemapSecret())
    .update(encoded)
    .digest('base64url');
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as PartitionPayload;
    if (parsed.v !== 1) return undefined;
    if (parsed.generationAt !== PARTITION_SCHEMA_GENERATION_AT) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const staticResources = () => {
  const now = new Date().toISOString();
  return STATIC_SITEMAP_PATHS.map((canonicalPath) => ({
    type: 'STATIC' as const,
    key: canonicalPath,
    canonicalPath,
    updatedAt: now,
  }));
};

const floorForType = (type: SitemapResource['type']) => {
  if (type === 'ARTICLE') return '';
  if (type === 'PROFILE') return '00000000-0000-0000-0000-000000000000';
  return '0';
};

export const collectSitemapResources = async (scope?: {
  type: SitemapResource['type'];
  lowerExclusiveKey: string | null;
  upperInclusiveKey: string;
}): Promise<SitemapResource[]> => {
  if (scope?.type === 'STATIC') {
    return staticResources()
      .filter(
        (resource) =>
          (scope.lowerExclusiveKey === null ||
            resource.key > scope.lowerExclusiveKey) &&
          resource.key <= scope.upperInclusiveKey,
      )
      .toSorted((left, right) => left.key.localeCompare(right.key));
  }

  const range = scope
    ? {
        partitionStartExclusive:
          scope.lowerExclusiveKey ?? floorForType(scope.type),
        partitionEndInclusive: scope.upperInclusiveKey,
      }
    : {};
  const [insights, community, profiles] = await Promise.all([
    !scope || ['ARTICLE', 'ISLAND', 'KOAN'].includes(scope.type)
      ? getInsightSitemapResourcesInServer({
          ...range,
          ...(scope ? { types: scope.type } : {}),
        })
      : [],
    !scope || ['POST', 'ROOM', 'QUESTION'].includes(scope.type)
      ? getCommunitySitemapResourcesInServer({
          ...range,
          ...(scope ? { types: scope.type } : {}),
        })
      : [],
    !scope || scope.type === 'PROFILE'
      ? getPublicProfileSitemapResourcesInServer(range)
      : [],
  ]);

  return [
    ...(scope ? [] : staticResources()),
    ...insights.map((resource) => ({
      type: resource.type,
      key: resource.resourceKey,
      canonicalPath: resource.canonicalPath,
      updatedAt: resource.updatedAt,
    })),
    ...community.map((resource) => ({
      type: resource.type,
      key: String(resource.id),
      canonicalPath: resource.canonicalPath,
      updatedAt: resource.updatedAt,
    })),
    ...profiles.map((resource) => ({
      type: 'PROFILE' as const,
      key: resource.publicProfileUuid,
      canonicalPath: resource.canonicalPath,
      updatedAt: resource.updatedAt,
    })),
  ];
};

const compareResourceKeys = (
  type: SitemapResource['type'],
  left: string,
  right: string,
) => {
  if (['ISLAND', 'KOAN', 'POST', 'ROOM', 'QUESTION'].includes(type)) {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
};

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const renderUrlsetXml = (resources: SitemapResource[]) => {
  const body = resources
    .map(
      (resource) =>
        `<url><loc>${escapeXml(`${SITE_ORIGIN}${resource.canonicalPath}`)}</loc><lastmod>${escapeXml(resource.updatedAt)}</lastmod></url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
};

export const buildUrlsetXml = (resources: SitemapResource[]) => {
  const xml = renderUrlsetXml(resources);
  if (
    resources.length > MAX_URLS ||
    Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES
  ) {
    throw new Error('Sitemap shard limit exceeded');
  }
  return xml;
};

export const buildPartitions = (resources: SitemapResource[]) => {
  // Map.groupBy 는 Node 21+ 전용이다. package.json engines 는 >=20.9.0 이고
  // 배포 이미지는 node:20-alpine 이라 실서버에서 TypeError 로 죽었다.
  // 그 결과 /sitemap.xml 이 503 이 됐다(2026-08-17 QA 관측, 컨테이너 v20.20.2).
  // 개발 기계 Node 가 더 높아 로컬·CI 에서는 통과했다. 표준 문법으로 바꾼다.
  const grouped = new Map<SitemapResource['type'], SitemapResource[]>();
  for (const resource of resources) {
    const bucket = grouped.get(resource.type);
    if (bucket) bucket.push(resource);
    else grouped.set(resource.type, [resource]);
  }
  // Shard paths are permanent capabilities for a signed type/range. Every
  // shard request obtains a fresh five-minute backend snapshot, so crawler
  // scheduling never depends on the root index fetch time.
  const generationAt = PARTITION_SCHEMA_GENERATION_AT;
  return [...grouped.entries()].flatMap(([type, entries]) => {
    const sorted = entries.toSorted((left, right) =>
      compareResourceKeys(type, left.key, right.key),
    );
    const partitions: Array<{
      type: SitemapResource['type'];
      token: string;
    }> = [];
    let start = 0;
    while (start < sorted.length) {
      let end = Math.min(start + MAX_URLS, sorted.length);
      while (
        end > start + 1 &&
        Buffer.byteLength(renderUrlsetXml(sorted.slice(start, end)), 'utf8') >
          MAX_XML_BYTES
      ) {
        end = start + Math.floor((end - start) / 2);
      }
      if (
        Buffer.byteLength(renderUrlsetXml(sorted.slice(start, end)), 'utf8') >
        MAX_XML_BYTES
      ) {
        throw new Error('A single sitemap URL exceeds the XML byte limit');
      }
      const payload: PartitionPayload = {
        v: 1,
        type,
        lowerExclusiveKey: start === 0 ? null : sorted[start - 1].key,
        upperInclusiveKey: sorted[end - 1].key,
        generationAt,
      };
      partitions.push({ type, token: signPartition(payload) });
      start = end;
    }
    return partitions;
  });
};

export const buildSitemapIndexXml = (
  partitions: Array<{ type: SitemapResource['type']; token: string }>,
) => {
  const body = partitions
    .map(
      ({ type, token }) =>
        `<sitemap><loc>${SITE_ORIGIN}/sitemaps/${type.toLowerCase()}/${token}.xml</loc></sitemap>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
};

export const resourcesForPartition = (
  resources: SitemapResource[],
  payload: PartitionPayload,
) =>
  resources
    .filter(
      (resource) =>
        resource.type === payload.type &&
        (payload.lowerExclusiveKey === null ||
          compareResourceKeys(
            payload.type,
            resource.key,
            payload.lowerExclusiveKey,
          ) > 0) &&
        compareResourceKeys(
          payload.type,
          resource.key,
          payload.upperInclusiveKey,
        ) <= 0,
    )
    .toSorted((left, right) =>
      compareResourceKeys(payload.type, left.key, right.key),
    );
