import type { Metadata } from 'next';
import { getCommunitySitemapResourcesInServer } from '@/api/endpoints/community/community-seo.server';
import LoginModal from '@/components/auth/modals/login-modal';
import { JsonLd } from '@/components/common/seo/json-ld';
import CommunityRoomHubPage from '@/components/community/pages/community-room-hub-page';
import { generateMetadata as generateSEOMetadata } from '@/utils/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: '커뮤니티',
  description:
    'AI로 만들다 막힌 사람들이 모인 공부방. 같은 곳에서 막힌 사람이 이미 답을 남겼습니다. 혼자 막히지 않습니다.',
  path: '/community',
  keywords: [
    '개발자 커뮤니티',
    '질문답변',
    '자유 글',
    '자랑거리',
    'IT 지식',
    '디스코드 커뮤니티',
  ],
  canonicalUrl: 'https://www.zeroone.it.kr/community',
});

export default async function CommunityPage() {
  // 방 개별 페이지에는 구조화 데이터가 있는데 허브에는 없어서, 크롤러가 허브만
  // 읽었을 때 이 아래에 무엇이 있는지 알 수 없었다(2026-08-17 QA 관측).
  // 방 목록은 사이트맵 자료를 그대로 재사용한다. 방 이름을 얻으려면 방마다
  // 문서를 한 번씩 더 불러야 해서, 허브에서는 주소만 싣는다.
  const rooms = await getCommunitySitemapResourcesInServer({
    types: 'ROOM',
  }).catch(() => []);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ZERO ONE IT 커뮤니티',
    description: '활성 공부방을 모아 보는 커뮤니티 허브',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: rooms.map((room, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://www.zeroone.it.kr${room.canonicalPath}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={schema} />
      <CommunityRoomHubPage LoginModalComponent={LoginModal} />
    </>
  );
}
