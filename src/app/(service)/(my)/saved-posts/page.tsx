import type { Metadata } from 'next';
import SavedResourcesPage from '@/components/saved-resource/pages/saved-resources-page';

export const metadata: Metadata = {
  title: '저장한 글 | ZERO-ONE',
  description: '저장해 둔 공부방 글과 인사이트를 확인합니다.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SavedResourcesPage />;
}
