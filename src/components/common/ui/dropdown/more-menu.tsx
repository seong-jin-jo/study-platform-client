import { Ellipsis } from 'lucide-react';
import React from 'react';
import IconButton from '@/components/common/ui/icon-button';
import { Menu, shouldUseMenuMobileSheet } from '@/components/common/ui/menu';

interface MoreMenuProps {
  options: {
    label: string;
    value: string;
    onMenuClick: () => void;
  }[];
  iconSize: number;
}

export default function MoreMenu({ options, iconSize }: MoreMenuProps) {
  const useMobileSheet = shouldUseMenuMobileSheet(options);

  return (
    <Menu.Root>
      <Menu.Trigger disabled={options.length === 0}>
        <IconButton
          className="focus-visible:ring-2 focus-visible:ring-focus-ring md:h-400 md:w-400"
          disabled={options.length === 0}
          label="더보기"
          size="lg"
          title={options.length === 0 ? '메뉴 항목이 없습니다' : undefined}
          tone="ghost"
        >
          <Ellipsis aria-hidden="true" size={iconSize} />
        </IconButton>
      </Menu.Trigger>
      <Menu.Content align="end" mobileSheet={useMobileSheet}>
        {options.map((option) => (
          <Menu.Item key={option.value} onSelect={option.onMenuClick}>
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
