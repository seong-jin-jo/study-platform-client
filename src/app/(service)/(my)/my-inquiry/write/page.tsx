import type { Metadata } from 'next';
import { isValidVersion } from '@/features/whats-new/model/release-notes';
import PageClient from './page-client';

export const metadata: Metadata = {
  title: '문의 작성',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ whats_new?: string | string[] }>;
}) {
  // "새로운 기능" 카드의 '의견 남기기'가 ?whats_new=<버전> 으로 들어온다.
  // 형식이 맞는 버전만 제목에 미리 채워 넣는다(그 외 값은 무시).
  const { whats_new: whatsNew } = await searchParams;
  const version = Array.isArray(whatsNew) ? whatsNew[0] : whatsNew;

  return (
    <PageClient
      whatsNewVersion={isValidVersion(version) ? version : undefined}
    />
  );
}
