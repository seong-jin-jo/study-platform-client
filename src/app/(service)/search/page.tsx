import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import HomeFeed from '@/components/retention/home-feed';

export const metadata: Metadata = {
  title: '통합검색 | ZERO-ONE',
  description: '커뮤니티와 인사이트를 한 번에 검색합니다.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? '';

  if (query.length < 2 || query.length > 100) {
    redirect('/');
  }

  return <HomeFeed initialSearchQuery={query} />;
}
