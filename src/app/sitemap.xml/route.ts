import {
  buildPartitions,
  buildSitemapIndexXml,
  collectSitemapResources,
} from '@/api/endpoints/seo/sitemap.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const successHeaders = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const resources = await collectSitemapResources();
    const xml = buildSitemapIndexXml(buildPartitions(resources));
    return new Response(xml, { status: 200, headers: successHeaders });
  } catch (error) {
    // 503 만 내보내고 원인을 버리면 운영에서 손을 쓸 수 없다.
    // 실제로 QA 에서 이 경로가 죽었을 때 로그가 없어 원인 추적이 막혔다(2026-08-17).
    console.error('[sitemap-index] 생성 실패', error);
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
