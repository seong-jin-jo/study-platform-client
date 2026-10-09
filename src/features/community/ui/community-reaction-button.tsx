'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import ToggleButton from '@/components/common/ui/toggle/button';

interface CommunityReactionButtonProps {
  count: number;
  isActive: boolean;
  onClick: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export default function CommunityReactionButton({
  count,
  isActive,
  onClick,
  ariaLabel,
  disabled = false,
}: CommunityReactionButtonProps) {
  return (
    <ToggleButton
      pressed={isActive}
      onPressedChange={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'gap-75 rounded-100 border-0 p-100 font-designer-14m transition-colors focus-visible:ring-2 focus-visible:ring-fill-brand-default-default focus-visible:ring-offset-2 focus-visible:ring-offset-background-default focus-visible:outline-none data-[state=off]:bg-transparent data-[state=on]:bg-transparent disabled:cursor-not-allowed disabled:text-text-disabled disabled:opacity-100',
        isActive
          ? 'text-text-brand'
          : 'text-text-subtle hover:text-text-default',
      )}
    >
      <Heart
        className={cn('h-200 w-200 shrink-0', isActive && 'fill-current')}
      />
      <span>{count.toLocaleString()}</span>
    </ToggleButton>
  );
}
