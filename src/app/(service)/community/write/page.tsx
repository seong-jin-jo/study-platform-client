import type { Metadata } from 'next';
import {
  normalizeCommunityBoardParam,
  normalizeCommunityCohortIdParam,
  normalizeCommunityPageParam,
  normalizeCommunityRoomIdParam,
} from '@/features/community/model/community-route';
import CommunityWritePageClient from '@/features/community/ui/pages/community-write-page-client';

interface CommunityWritePageProps {
  searchParams: Promise<{
    board?: string | string[];
    cohortId?: string | string[];
    roomId?: string | string[];
    page?: string | string[];
    insightDocumentId?: string | string[];
    insightTitle?: string | string[];
    insightSlug?: string | string[];
  }>;
}

export const metadata: Metadata = {
  title: '커뮤니티 글 작성 | ZERO-ONE',
  description: 'ZERO-ONE 커뮤니티 글 작성 페이지입니다.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CommunityWritePage({
  searchParams,
}: CommunityWritePageProps) {
  const {
    board,
    cohortId,
    page,
    roomId,
    insightDocumentId,
    insightTitle,
    insightSlug,
  } = await searchParams;
  const scalar = (value?: string | string[]) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
  const normalizedInsightDocumentId = scalar(insightDocumentId);
  const normalizedInsightTitle = scalar(insightTitle);
  const normalizedInsightSlug = scalar(insightSlug);

  return (
    <CommunityWritePageClient
      mode="create"
      initialBoard={normalizeCommunityBoardParam(board)}
      initialCohortId={normalizeCommunityCohortIdParam(cohortId)}
      initialRoomId={normalizeCommunityRoomIdParam(roomId)}
      initialInsightReference={
        normalizedInsightDocumentId &&
        normalizedInsightTitle &&
        normalizedInsightSlug
          ? {
              documentId: normalizedInsightDocumentId,
              title: normalizedInsightTitle,
              slug: normalizedInsightSlug,
            }
          : undefined
      }
      returnPage={normalizeCommunityPageParam(page)}
    />
  );
}
