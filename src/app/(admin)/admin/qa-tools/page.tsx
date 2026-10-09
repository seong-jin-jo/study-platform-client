import { notFound } from 'next/navigation';
import QaToolsPageClient from '@/components/admin/qa-tools/qa-tools-page-client';
import { isProduction } from '@/utils/is-production';

// DEV/스테이징 전용. 운영(prod)에서는 노출하지 않는다.
// 백엔드 @Profile("!prod") 가 hard gate, 이 게이트는 프론트 편의용이다.
export default function AdminQaToolsPage() {
  if (isProduction()) {
    notFound();
  }

  return <QaToolsPageClient />;
}
