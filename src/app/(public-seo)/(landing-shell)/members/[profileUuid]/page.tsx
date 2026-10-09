import { notFound } from 'next/navigation';
import { getPublicProfileInServer } from '@/api/endpoints/community/public-profile.server';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import PublicProfileContent from '@/components/community/public-profile-content';
import { createUrl, normalizeDescription } from '@/utils/seo';

interface PublicProfilePageProps {
  params: Promise<{ profileUuid: string }>;
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { profileUuid } = await params;
  const profile = await getPublicProfileInServer(profileUuid);
  if (!profile) notFound();

  const profileSchema = profile.indexEligibility.indexable
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          identifier: profile.publicProfileUuid,
          name: profile.nickname,
          description:
            profile.simpleIntroduction ?? profile.buildGoal ?? undefined,
          image: profile.profileImageUrl ?? undefined,
        },
        hasPart: profile.posts.items.map((post) => ({
          '@type': 'Article',
          url: createUrl(post.destination),
          headline: post.title,
        })),
      }
    : undefined;
  const description = normalizeDescription(
    profile.simpleIntroduction ??
      profile.buildGoal ??
      `${profile.nickname}님의 ZERO ONE IT 빌더 프로필입니다.`,
  );
  const canonical = createUrl(profile.canonicalPath);

  return (
    <main className="mx-auto w-full max-w-3xl px-300 py-600 sm:px-400">
      <PublicSeoHead
        title={`${profile.nickname}님의 빌더 프로필 | ZERO ONE IT`}
        description={description}
        canonical={canonical}
        indexable={profile.indexEligibility.indexable}
        ogType="profile"
        image={profile.profileImageUrl}
      />
      {profileSchema && <JsonLd data={profileSchema} />}
      <div className="rounded-200 border border-border-subtle bg-background-default p-400 shadow-1">
        <PublicProfileContent profile={profile} />
      </div>
    </main>
  );
}
