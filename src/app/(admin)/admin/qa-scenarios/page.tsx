import { notFound } from 'next/navigation';
import QaScenariosPageClient from '@/components/admin/qa-scenarios/qa-scenarios-page-client';
import { isProduction } from '@/utils/is-production';

// DEV/스테이징 전용. 운영(prod)에서는 노출하지 않는다 (QA 시드 도구와 동일 정책).
export default function AdminQaScenariosPage() {
  if (isProduction()) {
    notFound();
  }

  return <QaScenariosPageClient />;
}
