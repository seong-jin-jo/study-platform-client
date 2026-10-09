import type { Metadata } from 'next';
import PublicRootHome from '@/components/home/pages/public-root-home';

export const metadata: Metadata = {
  title: 'ZERO ONE IT | 혼자 막히지 않는 바이브코딩',
  description:
    '같은 곳에서 막힌 사람이 이미 답을 남겼어요. 0에서 1까지, 개발자가 아닌 사람들의 IT 커뮤니티.',
  alternates: { canonical: 'https://www.zeroone.it.kr' },
};

export default function HomeFeedPage() {
  return <PublicRootHome />;
}
