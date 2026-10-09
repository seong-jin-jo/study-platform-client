'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/ui/modal';
import PublicProfileContent, {
  PublicProfileHeader,
} from '@/components/community/public-profile-content';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useMyCommunityContextQuery } from '@/hooks/queries/community/use-community-discovery-query';
import { usePublicProfileQuery } from '@/hooks/queries/community/use-public-profile-query';
import styles from './public-profile-modal.module.css';

export default function InterceptedPublicProfileModal({
  profileUuid,
}: {
  profileUuid: string;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuthReady();
  const profileQuery = usePublicProfileQuery(profileUuid);
  const contextQuery = useMyCommunityContextQuery();
  const profile = profileQuery.data;
  const isOwnProfile =
    Boolean(profile) &&
    contextQuery.data?.publicProfileUrl === profile?.canonicalPath;

  return (
    <Modal.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Modal.Portal>
        <Modal.Overlay className="opacity-60" />
        <Modal.Content
          description="공개 빌더 프로필"
          className={styles.surface}
        >
          <Modal.Header
            variant="form"
            className="shrink-0 items-center gap-100 px-250 py-175"
          >
            {profile ? (
              <>
                <Modal.Title className="sr-only">
                  {profile.nickname} 공개 프로필
                </Modal.Title>
                <PublicProfileHeader
                  profile={profile}
                  showReport={isAuthenticated && !isOwnProfile}
                  showEdit={isAuthenticated && isOwnProfile}
                />
              </>
            ) : (
              <Modal.Title>빌더 프로필</Modal.Title>
            )}
            <Modal.CloseButton
              aria-label="프로필 닫기"
              className="size-550 shrink-0"
            />
          </Modal.Header>
          <Modal.Body className="px-250 py-250 sm:px-300">
            {profileQuery.isLoading ? (
              <output
                aria-label="프로필을 불러오는 중"
                className="flex flex-col gap-200"
              >
                <span className="h-1000 animate-pulse rounded-150 bg-background-disabled" />
                <span className="h-2000 animate-pulse rounded-150 bg-background-disabled" />
                <span className="h-2000 animate-pulse rounded-150 bg-background-disabled" />
              </output>
            ) : profileQuery.isError || !profile ? (
              <p role="alert" className="font-designer-14r text-text-subtle">
                프로필을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
              </p>
            ) : (
              <PublicProfileContent
                profile={profile}
                hideHeader={true}
                showOwnerNotice={isOwnProfile}
              />
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
