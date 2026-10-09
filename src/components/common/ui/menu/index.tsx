'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const MENU_SIDE_OFFSET = 4;
const MENU_COLLISION_PADDING = 16;

export function shouldUseMenuMobileSheet(
  items: ReadonlyArray<{ label: string }>,
) {
  return items.length > 6 || items.some(({ label }) => label.length > 12);
}

const menuItemBaseClassName =
  'relative flex h-600 w-full cursor-pointer select-none items-center gap-100 rounded-100 px-200 py-100 font-designer-14m outline-none md:h-500 data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-focus-ring data-[visual-disabled=true]:cursor-not-allowed data-[visual-disabled=true]:text-text-disabled';

type MenuTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>,
  'asChild'
> & {
  children: React.ReactElement;
};

function MenuTrigger({ children, ...props }: MenuTriggerProps) {
  return (
    <DropdownMenuPrimitive.Trigger asChild {...props}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
}

type MenuContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
> & {
  mobileSheet?: boolean;
};

function MenuContent({
  align = 'start',
  children,
  className,
  loop = true,
  mobileSheet = false,
  sideOffset = MENU_SIDE_OFFSET,
  ...props
}: MenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <>
        {mobileSheet && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-background-dimmer md:hidden"
          />
        )}
        <DropdownMenuPrimitive.Content
          align={align}
          className={cn(
            'z-50 flex max-h-4000 min-w-2500 max-w-4000 flex-col gap-50 overflow-y-auto rounded-100 border border-border-subtle bg-background-default p-50 text-text-default shadow-2',
            mobileSheet &&
              'max-md:fixed max-md:inset-x-200 max-md:bottom-0 max-md:max-w-none max-md:rounded-t-150 max-md:rounded-b-0 max-md:pb-[env(safe-area-inset-bottom)]',
            className,
          )}
          collisionPadding={MENU_COLLISION_PADDING}
          loop={loop}
          sideOffset={sideOffset}
          {...props}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </>
    </DropdownMenuPrimitive.Portal>
  );
}

type MenuItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
  'disabled'
> & {
  disabled?: boolean;
  disabledReason?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
};

function MenuItem({
  children,
  className,
  disabled = false,
  disabledReason,
  icon,
  onSelect,
  tone = 'default',
  ...props
}: MenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      aria-disabled={disabled || undefined}
      className={cn(
        menuItemBaseClassName,
        tone === 'default' &&
          'text-text-subtle data-[highlighted]:bg-fill-neutral-subtle-hover active:bg-fill-neutral-subtle-pressed',
        tone === 'danger' &&
          'text-text-error data-[highlighted]:bg-fill-danger-subtle-hover active:bg-fill-danger-subtle-pressed',
        className,
      )}
      data-visual-disabled={disabled}
      onSelect={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onSelect?.(event);
      }}
      {...props}
    >
      {icon && (
        <span className="flex size-200 shrink-0 items-center">{icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {disabledReason && (
        <span className="shrink-0 font-designer-12m text-text-disabled">
          {disabledReason}
        </span>
      )}
    </DropdownMenuPrimitive.Item>
  );
}

type MenuRadioItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>,
  'disabled'
> & {
  disabled?: boolean;
  disabledReason?: string;
  icon?: React.ReactNode;
};

function MenuRadioItem({
  children,
  className,
  disabled = false,
  disabledReason,
  icon,
  onSelect,
  ...props
}: MenuRadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      aria-disabled={disabled || undefined}
      className={cn(
        menuItemBaseClassName,
        'text-text-subtle data-[state=checked]:font-designer-14b data-[highlighted]:bg-fill-neutral-subtle-hover active:bg-fill-neutral-subtle-pressed',
        className,
      )}
      data-visual-disabled={disabled}
      onSelect={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onSelect?.(event);
      }}
      {...props}
    >
      <span className="flex size-200 shrink-0 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-200" />
        </DropdownMenuPrimitive.ItemIndicator>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {disabledReason && (
        <span className="shrink-0 font-designer-12m text-text-disabled">
          {disabledReason}
        </span>
      )}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function MenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'px-200 py-100 font-designer-12m text-text-subtlest',
        className,
      )}
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('h-px bg-border-subtle', className)}
      {...props}
    />
  );
}

export const Menu = {
  Content: MenuContent,
  Item: MenuItem,
  Label: MenuLabel,
  RadioGroup: DropdownMenuPrimitive.RadioGroup,
  RadioItem: MenuRadioItem,
  Root: DropdownMenuPrimitive.Root,
  Separator: MenuSeparator,
  Trigger: MenuTrigger,
};

export type { MenuContentProps, MenuItemProps, MenuRadioItemProps };
