import { Flag, Home, PencilLine } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicProfileResponse } from '@/types/api/public-profile.types';

interface PublicProfileContentProps {
  profile: PublicProfileResponse;
  showReport?: boolean;
  showEdit?: boolean;
  showOwnerNotice?: boolean;
  hideHeader?: boolean;
  onNavigate?: () => void;
}

interface PublicProfileHeaderProps {
  profile: PublicProfileResponse;
  showReport?: boolean;
  showEdit?: boolean;
  onNavigate?: () => void;
}

export function PublicProfileHeader({
  profile,
  showReport = false,
  showEdit = false,
  onNavigate,
}: PublicProfileHeaderProps) {
  return (
    <header className="flex min-w-0 flex-1 items-center gap-200">
      {profile.profileImageUrl ? (
        <Image
          src={profile.profileImageUrl}
          alt={profile.nickname}
          width={52}
          height={52}
          unoptimized
          className="size-650 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-650 shrink-0 items-center justify-center rounded-full bg-background-brand-default font-designer-18b text-text-brand">
          {profile.nickname.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-designer-20b text-text-strong">
          {profile.nickname}
        </h1>
        <p className="mt-50 font-designer-13m text-text-subtle">
          {profile.weeksTogetherLabel}
        </p>
      </div>
      {showReport && (
        <Link
          href={`/my-inquiry/write?profileUuid=${encodeURIComponent(profile.publicProfileUuid)}`}
          onClick={onNavigate}
          className="flex min-h-550 items-center gap-75 rounded-100 px-150 font-designer-13b text-text-subtle"
        >
          <Flag aria-hidden="true" size={16} />
          신고
        </Link>
      )}
      {showEdit && (
        <Link
          href="/my-page"
          onClick={onNavigate}
          className="flex min-h-550 items-center gap-75 rounded-100 px-150 font-designer-13b text-text-subtle"
        >
          <PencilLine aria-hidden="true" size={16} />
          고치기
        </Link>
      )}
    </header>
  );
}

export default function PublicProfileContent({
  profile,
  showReport = false,
  showEdit = false,
  showOwnerNotice = false,
  hideHeader = false,
  onNavigate,
}: PublicProfileContentProps) {
  return (
    <div className="flex flex-col gap-400">
      {!hideHeader && (
        <PublicProfileHeader
          profile={profile}
          showReport={showReport}
          showEdit={showEdit}
          onNavigate={onNavigate}
        />
      )}

      {showOwnerNotice && (
        <p className="rounded-150 bg-background-neutral-subtle p-200 font-designer-13r leading-300 text-text-subtle">
          지금 보고 있는 것이 남에게 보이는 화면이에요. 휴대폰 번호와 이메일,
          결제 내역과 평판은 여기 나오지 않아요.
        </p>
      )}

      {profile.buildGoal && (
        <section>
          <h2 className="font-designer-15b text-text-strong">
            만들어보고 싶은 것
          </h2>
          <p className="mt-75 font-designer-14r leading-300 text-text-default">
            {profile.buildGoal}
          </p>
        </section>
      )}

      {profile.simpleIntroduction && (
        <section>
          <h2 className="font-designer-15b text-text-strong">자기소개</h2>
          <p className="mt-75 font-designer-14r leading-300 text-text-default">
            {profile.simpleIntroduction}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-designer-15b text-text-strong">
          이 사람이 있는 방
        </h2>
        <div className="mt-100 flex flex-col divide-y divide-border-subtle rounded-150 border border-border-subtle">
          {profile.rooms.items.length === 0 ? (
            <p className="p-250 font-designer-13r text-text-subtle">
              아직 정착한 방이 없어요
            </p>
          ) : (
            profile.rooms.items.map((room) => (
              <Link
                key={room.roomId}
                href={`/community/rooms/${room.roomId}`}
                onClick={onNavigate}
                className="flex min-h-600 items-center gap-150 px-250 font-designer-14b text-text-default hover:bg-background-neutral-subtle"
              >
                <Home
                  aria-hidden="true"
                  size={18}
                  className="text-text-subtle"
                />
                {room.name}
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-designer-15b text-text-strong">최근에 쓴 글</h2>
        <div className="mt-100 flex flex-col divide-y divide-border-subtle rounded-150 border border-border-subtle">
          {profile.posts.items.length === 0 ? (
            <p className="p-250 font-designer-13r text-text-subtle">
              아직 남긴 글이 없어요
            </p>
          ) : (
            profile.posts.items.map((post) => (
              <Link
                key={post.postId}
                href={post.destination}
                onClick={onNavigate}
                className="flex gap-150 px-250 py-200 hover:bg-background-neutral-subtle"
              >
                <PencilLine
                  aria-hidden="true"
                  size={18}
                  className="mt-25 shrink-0 text-text-subtle"
                />
                <span className="min-w-0">
                  <span className="block font-designer-14b text-text-default">
                    {post.title}
                  </span>
                  <span className="mt-50 line-clamp-2 block font-designer-12r text-text-subtle">
                    {post.previewText}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
        {profile.posts.nextCursor && (
          <p className="mt-100 text-center font-designer-12r text-text-subtle">
            최근 글 5개를 보여드려요
          </p>
        )}
      </section>
    </div>
  );
}
