// biome-ignore-all lint/a11y/noNoninteractiveTabindex: WAI-ARIA tabpanel은 키보드 포커스 이동 대상이다.
'use client';

import { Lock } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Tooltip from '@/components/common/ui/tooltip';

interface TabItem {
  label: string;
  value: string;
  locked?: boolean;
  lockedTooltip?: string;
  panel?: React.ReactNode;
}

interface SectionTabsProps {
  /** 탭 목록 */
  tabs: TabItem[];
  /** 선택된 탭 */
  activeTab: string;
  /** 탭 클릭 시 호출 */
  onChange: (value: string) => void;
  /** 탭 묶음의 접근 가능한 이름 */
  ariaLabel?: string;
  /** 추가 className */
  className?: string;
}

const tabBaseClass =
  'shrink-0 border-b-2 p-150 font-designer-16b outline-none transition-colors max-lg:min-h-550 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring';
const lockedTabButtonClass = cn(
  tabBaseClass,
  'flex cursor-not-allowed items-center gap-50 border-transparent text-text-disabled',
);

interface LockedTabButtonProps {
  buttonRef: (node: HTMLButtonElement | null) => void;
  controlsId: string;
  id: string;
  isActive: boolean;
  label: string;
  lockedTooltip?: string;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
  tabIndex: number;
}

function LockedTabButton({
  buttonRef,
  controlsId,
  id,
  isActive,
  label,
  lockedTooltip,
  onKeyDown,
  tabIndex,
}: LockedTabButtonProps) {
  const [open, setOpen] = React.useState(false);
  const trigger = (
    <button
      ref={buttonRef}
      aria-controls={controlsId}
      aria-selected={isActive}
      className={lockedTabButtonClass}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' && lockedTooltip) {
          setOpen((currentOpen) => !currentOpen);
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && lockedTooltip) setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && lockedTooltip) setOpen(false);
      }}
      id={id}
      role="tab"
      tabIndex={tabIndex}
      type="button"
    >
      {label}
      <Lock aria-hidden="true" size={14} />
      <span className="sr-only">잠김</span>
    </button>
  );

  if (!lockedTooltip) return trigger;

  return (
    <Tooltip
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      value={lockedTooltip}
      side="bottom"
      delayDuration={0}
      contentClassName="font-designer-12m rounded-100 bg-background-neutral-strong whitespace-nowrap px-200 shadow-lg"
    />
  );
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel = '콘텐츠 탭',
  className,
}: SectionTabsProps) {
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const idPrefix = React.useId();
  const activeIndex = tabs.findIndex((tab) => tab.value === activeTab);
  const tabStopIndex = activeIndex >= 0 ? activeIndex : 0;
  const activePanel = activeIndex >= 0 ? tabs[activeIndex] : undefined;

  const moveFocus = (currentIndex: number, key: string) => {
    let nextIndex = currentIndex;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    }
    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (key === 'Home') nextIndex = 0;
    if (key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex) return;

    buttonRefs.current[nextIndex]?.focus();
    if (!tabs[nextIndex].locked) onChange(tabs[nextIndex].value);
  };

  return (
    <div className="w-full">
      <div
        aria-label={ariaLabel}
        className={cn(
          'flex w-full cursor-pointer gap-200 overflow-x-auto border-b border-border-subtle',
          className,
        )}
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.value;
          const tabId = `${idPrefix}-tab-${index}`;
          const panelId = `${idPrefix}-panel-${index}`;
          const onKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (
            event,
          ) => {
            if (
              [
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'End',
                'Home',
              ].includes(event.key)
            ) {
              event.preventDefault();
              moveFocus(index, event.key);
            }
          };
          const buttonRef = (node: HTMLButtonElement | null) => {
            buttonRefs.current[index] = node;
          };

          if (tab.locked) {
            return (
              <LockedTabButton
                key={tab.value}
                buttonRef={buttonRef}
                controlsId={panelId}
                id={tabId}
                isActive={isActive}
                label={tab.label}
                lockedTooltip={tab.lockedTooltip}
                onKeyDown={onKeyDown}
                tabIndex={tabStopIndex === index ? 0 : -1}
              />
            );
          }

          return (
            <button
              key={tab.value}
              ref={buttonRef}
              aria-controls={panelId}
              aria-selected={isActive}
              className={cn(
                tabBaseClass,
                isActive
                  ? 'border-primary text-primary text-text-strong'
                  : 'border-transparent text-text-disabled hover:text-text-subtle',
              )}
              id={tabId}
              onClick={() => onChange(tab.value)}
              onKeyDown={onKeyDown}
              role="tab"
              tabIndex={tabStopIndex === index ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activePanel && (
        <div
          aria-labelledby={`${idPrefix}-tab-${activeIndex}`}
          id={`${idPrefix}-panel-${activeIndex}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activePanel.panel}
        </div>
      )}
    </div>
  );
}

export type { SectionTabsProps, TabItem };
