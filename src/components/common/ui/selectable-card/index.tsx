'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

interface SelectableCardMetadata {
  disabled: boolean;
  value: string;
}

interface SelectableCardGroupContextValue {
  focus: (value: string) => void;
  items: SelectableCardMetadata[];
  registerRef: (value: string, node: HTMLDivElement | null) => void;
  selectedValue?: string;
  select: (value: string) => void;
}

const SelectableCardGroupContext = React.createContext<
  SelectableCardGroupContextValue | undefined
>(undefined);

function useSelectableCardGroup() {
  const context = React.useContext(SelectableCardGroupContext);
  if (!context) {
    throw new Error(
      'SelectableCard.Item은 SelectableCard.Group 안에서 사용해야 합니다.',
    );
  }
  return context;
}

interface SelectableCardGroupProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, 'defaultValue'> {
  defaultValue?: string;
  label: string;
  onValueChange?: (value: string) => void;
  value?: string;
}

function SelectableCardGroup({
  children,
  className,
  defaultValue,
  label,
  onValueChange,
  value,
  ...props
}: SelectableCardGroupProps) {
  const childItems = React.Children.toArray(children).filter(
    React.isValidElement<SelectableCardItemProps>,
  );
  const items = childItems.map(({ props: itemProps }) => ({
    disabled: itemProps.disabled ?? false,
    value: itemProps.value,
  }));
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = value ?? internalValue;

  if (items.length === 0) return null;

  const select = (nextValue: string) => {
    const item = items.find(({ value: itemValue }) => itemValue === nextValue);
    if (!item || item.disabled) return;
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const registerRef = (itemValue: string, node: HTMLDivElement | null) => {
    if (node) refs.current.set(itemValue, node);
    else refs.current.delete(itemValue);
  };

  const focus = (itemValue: string) => {
    refs.current.get(itemValue)?.focus();
  };

  const contextValue = {
    focus,
    items,
    registerRef,
    selectedValue,
    select,
  };

  return (
    <SelectableCardGroupContext.Provider value={contextValue}>
      <ul
        aria-label={label}
        className={cn(
          'grid list-none gap-150 md:gap-200',
          items.length <= 2
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          className,
        )}
        role="radiogroup"
        {...props}
      >
        {children}
      </ul>
    </SelectableCardGroupContext.Provider>
  );
}

interface SelectableCardItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  disabled?: boolean;
  disabledReason?: string;
  media?: React.ReactNode;
  onSelect?: (value: string) => void;
  value: string;
}

function SelectableCardItem({
  children,
  className,
  disabled = false,
  disabledReason,
  media,
  onKeyDown,
  onSelect,
  value,
  ...props
}: SelectableCardItemProps) {
  const group = useSelectableCardGroup();
  const checked = group.selectedValue === value;
  const fallbackTabValue =
    group.selectedValue ??
    group.items.find((item) => !item.disabled)?.value ??
    group.items[0]?.value;

  const selectCurrent = () => {
    if (disabled) return;
    group.select(value);
    onSelect?.(value);
  };

  const focusCard = (direction: 'end' | 'next' | 'previous' | 'start') => {
    const currentIndex = group.items.findIndex((item) => item.value === value);
    let targetIndex = currentIndex;
    if (direction === 'start') targetIndex = 0;
    if (direction === 'end') targetIndex = group.items.length - 1;
    if (direction === 'next') {
      targetIndex = (currentIndex + 1) % group.items.length;
    }
    if (direction === 'previous') {
      targetIndex =
        (currentIndex - 1 + group.items.length) % group.items.length;
    }

    const target = group.items[targetIndex];
    group.focus(target.value);
    if (!target.disabled) {
      group.select(target.value);
    }
  };

  return (
    <li className="min-w-0" role="none">
      <div
        {...props}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={cn(
          'relative flex min-h-600 w-full cursor-pointer flex-col gap-100 rounded-200 border border-border-subtle bg-background-default p-200 text-left text-text-default outline-none hover:border-border-default active:bg-fill-neutral-subtle-pressed focus-visible:ring-2 focus-visible:ring-focus-ring md:p-300',
          checked &&
            'border-2 border-border-brand bg-fill-brand-subtle-default',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        data-selectable-card-value={value}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) selectCurrent();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;

          const directionByKey = {
            ArrowDown: 'next',
            ArrowLeft: 'previous',
            ArrowRight: 'next',
            ArrowUp: 'previous',
            End: 'end',
            Home: 'start',
          } as const;
          const direction =
            directionByKey[event.key as keyof typeof directionByKey];
          if (direction) {
            event.preventDefault();
            focusCard(direction);
            return;
          }
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            selectCurrent();
          }
        }}
        ref={(node) => group.registerRef(value, node)}
        role="radio"
        tabIndex={fallbackTabValue === value ? 0 : -1}
      >
        {checked && (
          <Check
            aria-hidden="true"
            className="absolute top-200 right-200 size-250 text-icon-brand"
          />
        )}
        {media && (
          <div className="relative aspect-square overflow-hidden rounded-200">
            {media}
          </div>
        )}
        {children}
        {disabledReason && (
          <span className="font-designer-12m text-text-disabled">
            {disabledReason}
          </span>
        )}
      </div>
    </li>
  );
}

export const SelectableCard = {
  Group: SelectableCardGroup,
  Item: SelectableCardItem,
};

export type { SelectableCardGroupProps, SelectableCardItemProps };
