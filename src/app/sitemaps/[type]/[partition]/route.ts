import {
  buildUrlsetXml,
  collectSitemapResources,
  verifyPartition,
} from '@/api/endpoints/seo/sitemap.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; partition: string }> },
) {
  const { type, partition } = await params;
  const token = partition.endsWith('.xml') ? partition.slice(0, -4) : partition;
  const payload = verifyPartition(token);
  if (!payload || payload.type.toLowerCase() !== type.toLowerCase()) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const resources = await collectSitemapResources({
      type: payload.type,
      lowerExclusiveKey: payload.lowerExclusiveKey,
      upperInclusiveKey: payload.upperInclusiveKey,
    });
    const xml = buildUrlsetXml(resources);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // 503 만 내보내고 원인을 버리면 운영에서 손을 쓸 수 없다.
    // 실제로 QA 에서 이 경로가 죽었을 때 로그가 없어 원인 추적이 막혔다(2026-08-17).
    console.error('[sitemap-shard] 생성 실패', error);
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '60',
      },
    });
  }
}
