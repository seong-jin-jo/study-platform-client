import InterceptedPublicProfileModal from '@/components/community/intercepted-public-profile-modal';

export default async function InterceptedPublicProfilePage({
  params,
}: {
  params: Promise<{ profileUuid: string }>;
}) {
  const { profileUuid } = await params;

  return <InterceptedPublicProfileModal profileUuid={profileUuid} />;
}
