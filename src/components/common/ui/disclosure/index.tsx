'use client';

import { ChevronDown, Lock } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

type DisclosureType = 'multiple' | 'single';
type DisclosureVariant = 'default' | 'dense';

interface DisclosureGroupContextValue {
  itemCount: number;
  openValues: string[];
  toggle: (value: string) => void;
  variant: DisclosureVariant;
}

interface DisclosureItemContextValue {
  buttonId: string;
  disabled: boolean;
  disabledReason?: string;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  open: boolean;
  panelId: string;
  toggle: () => void;
  useRegion: boolean;
  variant: DisclosureVariant;
}

const DisclosureGroupContext = React.createContext<
  DisclosureGroupContextValue | undefined
>(undefined);
const DisclosureItemContext = React.createContext<
  DisclosureItemContextValue | undefined
>(undefined);

function useDisclosureGroup() {
  const context = React.useContext(DisclosureGroupContext);
  if (!context) {
    throw new Error(
      'Disclosure.Item은 Disclosure.Group 안에서 사용해야 합니다.',
    );
  }
  return context;
}

function useDisclosureItem() {
  const context = React.useContext(DisclosureItemContext);
  if (!context) {
    throw new Error(
      'Disclosure.Header와 Disclosure.Panel은 Disclosure.Item 안에서 사용해야 합니다.',
    );
  }
  return context;
}

interface DisclosureGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  type?: DisclosureType;
  value?: string[];
  variant?: DisclosureVariant;
}

function DisclosureGroup({
  children,
  className,
  defaultValue = [],
  onValueChange,
  type = 'multiple',
  value,
  variant = 'default',
  ...props
}: DisclosureGroupProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const openValues = value ?? internalValue;

  if (items.length === 0) return null;

  const updateValue = (nextValue: string[]) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const toggle = (itemValue: string) => {
    const isOpen = openValues.includes(itemValue);
    if (type === 'single') {
      updateValue(isOpen ? [] : [itemValue]);
      return;
    }
    updateValue(
      isOpen
        ? openValues.filter((currentValue) => currentValue !== itemValue)
        : [...openValues, itemValue],
    );
  };

  return (
    <DisclosureGroupContext.Provider
      value={{ itemCount: items.length, openValues, toggle, variant }}
    >
      <div className={cn('flex flex-col gap-150', className)} {...props}>
        {children}
      </div>
    </DisclosureGroupContext.Provider>
  );
}

interface DisclosureItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  disabledReason?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  value: string;
}

function DisclosureItem({
  children,
  className,
  disabled = false,
  disabledReason,
  headingLevel = 3,
  value,
  ...props
}: DisclosureItemProps) {
  const group = useDisclosureGroup();
  const generatedId = React.useId();
  const buttonId = `${generatedId}-trigger`;
  const panelId = `${generatedId}-panel`;
  const open = group.openValues.includes(value);

  return (
    <DisclosureItemContext.Provider
      value={{
        buttonId,
        disabled,
        disabledReason,
        headingLevel,
        open,
        panelId,
        toggle: () => {
          if (!disabled) group.toggle(value);
        },
        useRegion: group.itemCount <= 6,
        variant: group.variant,
      }}
    >
      <div
        className={cn(
          'overflow-hidden border border-border-subtle bg-background-default',
          group.variant === 'default' ? 'rounded-200' : 'rounded-150',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </DisclosureItemContext.Provider>
  );
}

type DisclosureHeaderProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function DisclosureHeader({
  children,
  className,
  onClick,
  ...props
}: DisclosureHeaderProps) {
  const item = useDisclosureItem();
  const Heading = `h${item.headingLevel}` as const;

  return (
    <Heading>
      <button
        {...props}
        aria-controls={item.panelId}
        aria-disabled={item.disabled || undefined}
        aria-expanded={item.open}
        className={cn(
          'flex w-full items-center justify-between gap-200 text-left text-text-default outline-none transition-colors hover:bg-fill-neutral-subtle-hover active:bg-fill-neutral-subtle-pressed focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring',
          item.variant === 'default' &&
            'min-h-600 px-200 py-150 font-designer-16m md:min-h-700 md:px-300 md:font-designer-16b',
          item.variant === 'dense' &&
            'min-h-600 px-150 py-100 font-designer-14b',
          item.disabled && 'cursor-not-allowed text-text-disabled',
          className,
        )}
        id={item.buttonId}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) item.toggle();
        }}
        type="button"
      >
        {children}
        <span className="flex shrink-0 items-center gap-100">
          {item.disabled && <Lock aria-hidden="true" className="size-200" />}
          {item.disabledReason && (
            <span className="font-designer-12m text-text-disabled">
              {item.disabledReason}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'transition-transform duration-200',
              item.variant === 'default' ? 'size-300' : 'size-250',
              item.open && 'rotate-180',
            )}
          />
        </span>
      </button>
    </Heading>
  );
}

function DisclosurePanel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const item = useDisclosureItem();

  if (!item.open) return null;

  return (
    <div
      {...props}
      aria-labelledby={item.buttonId}
      className={cn(
        'border-t border-border-subtle text-text-subtle',
        item.variant === 'default' &&
          'px-200 py-300 font-designer-15r md:px-300 md:font-designer-16r',
        item.variant === 'dense' && 'px-150 py-200 font-designer-14r',
        className,
      )}
      id={item.panelId}
      role={item.useRegion ? 'region' : undefined}
    >
      <div className="max-w-8875">{children}</div>
    </div>
  );
}

export const Disclosure = {
  Group: DisclosureGroup,
  Header: DisclosureHeader,
  Item: DisclosureItem,
  Panel: DisclosurePanel,
};

export type {
  DisclosureGroupProps,
  DisclosureHeaderProps,
  DisclosureItemProps,
};
