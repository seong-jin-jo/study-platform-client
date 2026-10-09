'use client';

import Link from 'next/link';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import UserAvatar from '@/components/common/ui/avatar';

interface CommunityAuthorNameTriggerProps {
  memberId?: number;
  publicProfileUuid?: string;
  name: string;
  className?: string;
  image?: string;
  imageSize?: number;
  onNavigate?: () => void;
}

export default function CommunityAuthorNameTrigger({
  publicProfileUuid,
  name,
  className,
  image,
  imageSize = 20,
  onNavigate,
}: CommunityAuthorNameTriggerProps) {
  if (!publicProfileUuid) {
    if (!image)
      return (
        <span
          aria-disabled="true"
          title="프로필을 열 수 없는 사용자"
          className={cn('text-text-subtlest', className)}
        >
          {name}
          <span className="sr-only"> 프로필을 열 수 없음</span>
        </span>
      );
    return (
      <span
        aria-disabled="true"
        title="프로필을 열 수 없는 사용자"
        className="flex items-center gap-75 text-text-subtlest"
      >
        <UserAvatar image={image} size={imageSize} />
        <span className={cn(className)}>{name}</span>
        <span className="sr-only">프로필을 열 수 없음</span>
      </span>
    );
  }

  return image ? (
    <Link
      href={`/members/${publicProfileUuid}`}
      scroll={false}
      onClick={onNavigate}
      aria-label={`${name} 프로필 보기`}
      className="inline-flex cursor-pointer items-center gap-75 rounded-50 border-0 p-0 underline decoration-transparent underline-offset-4 transition-colors hover:opacity-80 hover:decoration-current focus-visible:text-text-brand focus-visible:decoration-current focus-visible:outline-none"
    >
      <UserAvatar image={image} size={imageSize} />
      <span className={cn(className)}>{name}</span>
    </Link>
  ) : (
    <Link
      href={`/members/${publicProfileUuid}`}
      scroll={false}
      onClick={onNavigate}
      aria-label={`${name} 프로필 보기`}
      className={cn(
        'cursor-pointer rounded-50 border-0 p-0 text-left transition-colors hover:text-text-brand focus-visible:text-text-brand focus-visible:outline-none',
        'underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:decoration-current',
        className,
      )}
    >
      {name}
    </Link>
  );
}
