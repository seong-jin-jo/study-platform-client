'use client';

import { Bookmark } from 'lucide-react';
import type { MouseEvent } from 'react';
import { requestDocumentAuthRecovery } from '@/api/client/auth-session-recovery';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { useAuthReady } from '@/features/auth/model/use-auth';
import {
  useSavedResourcesQuery,
  useSetSavedResourceMutation,
} from '@/hooks/queries/saved-resource/use-saved-resource-queries';
import { useToastStore } from '@/stores/use-toast-store';
import type { SavedResourceType } from '@/types/saved-resource';

interface SaveResourceButtonProps {
  className?: string;
  compact?: boolean;
  resourceKey: string;
  resourceType: SavedResourceType;
  showLabel?: boolean;
}

export default function SaveResourceButton({
  className,
  compact = false,
  resourceKey,
  resourceType,
  showLabel = false,
}: SaveResourceButtonProps) {
  const { isAuthenticated, isHydrated } = useAuthReady();
  const showToast = useToastStore((state) => state.showToast);
  const savedResources = useSavedResourcesQuery({
    enabled: isHydrated && isAuthenticated,
    size: 50,
    types: [resourceType],
  });
  const mutation = useSetSavedResourceMutation();
  const savedFromServer =
    savedResources.data?.pages
      .flatMap((page) => page.items)
      .some(
        (item) =>
          item.resourceType === resourceType &&
          item.resourceKey === resourceKey,
      ) ?? false;
  const mutationMatchesResource =
    mutation.variables?.resourceKey === resourceKey &&
    mutation.variables.resourceType === resourceType;
  const isSaved = mutationMatchesResource
    ? mutation.isPending
      ? (mutation.variables?.saved ?? savedFromServer)
      : (mutation.data?.saved ?? savedFromServer)
    : savedFromServer;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isHydrated || mutation.isPending) {
      return;
    }

    if (!isAuthenticated) {
      showToast('로그인하면 글을 저장할 수 있어요.', 'info');
      requestDocumentAuthRecovery();

      return;
    }

    const desiredState = !isSaved;

    try {
      const result = await mutation.mutateAsync({
        resourceKey,
        resourceType,
        saved: desiredState,
      });
      showToast(
        result.saved
          ? '저장했어요. 내 정보 > 저장한 글에서 볼 수 있어요'
          : '저장을 취소했어요',
        'success',
      );
    } catch {
      showToast('저장 상태를 바꾸지 못했어요. 다시 눌러 주세요.', 'error');
    }
  };

  return (
    <Button
      type="button"
      aria-label={isSaved ? '저장 취소' : '저장'}
      aria-pressed={isSaved}
      data-testid={`save-resource-${resourceType}-${resourceKey}`}
      disabled={mutation.isPending}
      onClick={handleClick}
      size="small"
      color="outlined"
      icon={
        <Bookmark
          className={cn('size-200', isSaved && 'fill-current')}
          aria-hidden="true"
        />
      }
      className={cn(
        'h-auto gap-50 rounded-100 border-0 bg-transparent text-text-subtle transition-colors hover:bg-background-alternative hover:text-text-default disabled:bg-transparent disabled:text-text-disabled',
        showLabel
          ? 'min-h-500 px-100 font-designer-13m'
          : compact
            ? 'min-h-425 min-w-425'
            : 'min-h-500 min-w-500',
        isSaved && 'text-text-brand',
        className,
      )}
    >
      {showLabel ? (isSaved ? '저장됨' : '저장') : null}
    </Button>
  );
}
