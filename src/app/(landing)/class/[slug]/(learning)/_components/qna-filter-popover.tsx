'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/common/ui/button';
import IconButton from '@/components/common/ui/icon-button';
import { Menu, shouldUseMenuMobileSheet } from '@/components/common/ui/menu';
import TextActionButton from '@/components/common/ui/text-action-button';
import { useGetCourseCurriculum } from '@/hooks/queries/course/course-queries';

import CloseIcon from 'public/icons/modal-close.svg';

export function SortLinesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <line x1="1" y1="2" x2="17" y2="2" />
      <line x1="1" y1="6" x2="11" y2="6" />
      <line x1="1" y1="10" x2="6" y2="10" />
    </svg>
  );
}

// Figma icons (Material Symbols Rounded — expand_more/expand_less, refresh)
function ChevronIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d={
          open
            ? 'M480-529 324-373q-11 11-28 11t-28-11q-11-11-11-28t11-28l184-184q6-6 13-8.5t15-2.5q8 0 15 2.5t13 8.5l184 184q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-529Z'
            : 'M465-364.5q-7-2.5-13-8.5L268-557q-11-11-11-28t11-28q11-11 28-11t28 11l156 156 156-156q11-11 28-11t28 11q11 11 11 28t-11 28L508-373q-6 6-13 8.5t-15 2.5q-8 0-15-2.5Z'
        }
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-70q0-17 11.5-28.5T760-800q17 0 28.5 11.5T800-760v200q0 17-11.5 28.5T760-520H560q-17 0-28.5-11.5T520-560q0-17 11.5-28.5T560-600h128q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q68 0 124.5-34.5T692-367q8-14 22.5-19.5t29.5-.5q16 5 23 21t-1 30q-41 80-117 128t-169 48Z" />
    </svg>
  );
}

interface DropdownProps {
  options: { label: string; value: number }[];
  value: number | null;
  placeholder: string;
  disabled?: boolean;
  onOpenStateChange?: (open: boolean) => void;
  onSelect: (value: number) => void;
}

function Dropdown({
  options,
  value,
  placeholder,
  disabled,
  onOpenStateChange,
  onSelect,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const unavailable = disabled || options.length === 0;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenStateChange?.(nextOpen);
  };

  const preventUnavailableOpen = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!unavailable) return;
    if (
      event.type === 'keydown' &&
      ![' ', 'ArrowDown', 'Enter'].includes(
        (event as React.KeyboardEvent<HTMLButtonElement>).key,
      )
    )
      return;
    event.preventDefault();
  };

  return (
    <Menu.Root modal={false} open={open} onOpenChange={handleOpenChange}>
      <Menu.Trigger>
        <Button
          aria-disabled={unavailable || undefined}
          color="outlined"
          icon={
            <ChevronIcon
              open={open}
              className="size-200 shrink-0 text-gray-400"
            />
          }
          iconPosition="right"
          onClick={preventUnavailableOpen}
          onKeyDown={preventUnavailableOpen}
          onPointerDown={preventUnavailableOpen}
          size="large"
          type="button"
          className="w-full justify-between font-designer-16r text-gray-500 aria-disabled:cursor-not-allowed aria-disabled:border-border-disabled aria-disabled:bg-background-disabled aria-disabled:text-text-disabled md:h-400 md:rounded-75 md:px-100 md:font-designer-14b"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {unavailable && (
            <span className="sr-only">, 선택할 항목이 아직 없어요</span>
          )}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        data-qna-filter-select-menu=""
        mobileSheet={shouldUseMenuMobileSheet(options)}
      >
        <Menu.RadioGroup
          value={value === null ? '' : String(value)}
          onValueChange={(nextValue) => onSelect(Number(nextValue))}
        >
          {options.map((option) => (
            <Menu.RadioItem key={option.value} value={String(option.value)}>
              {option.label}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

interface QnaFilterPopoverProps {
  slug: string;
  courseTitle: string;
  appliedChapterId?: number;
  appliedLessonId?: number;
  onApply: (lessonId?: number, chapterId?: number) => void;
}

export function QnaFilterPopover({
  slug,
  courseTitle,
  appliedChapterId,
  appliedLessonId,
  onApply,
}: QnaFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    appliedChapterId ?? null,
  );
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    appliedLessonId ?? null,
  );
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const innerMenuOpenRef = useRef(false);
  const { data: curriculum } = useGetCourseCurriculum(slug);
  const chapters = curriculum?.chapters ?? [];

  const chapterOptions = chapters.map((c) => ({
    label: c.title,
    value: c.chapterId,
  }));
  const lessonOptions =
    chapters
      .find((c) => c.chapterId === selectedChapterId)
      ?.lessons.map((l) => ({ label: l.title, value: l.lessonId })) ?? [];

  const handleReset = () => {
    setSelectedChapterId(null);
    setSelectedLessonId(null);
  };

  const handleApply = () => {
    onApply(selectedLessonId ?? undefined, selectedChapterId ?? undefined);
    innerMenuOpenRef.current = false;
    setOpen(false);
  };

  const handleInnerMenuOpenChange = useCallback((menuOpen: boolean) => {
    innerMenuOpenRef.current = menuOpen;
  }, []);

  const restoreTriggerFocus = useCallback(() => {
    queueMicrotask(() => {
      rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
  }, []);

  const closeAndRestoreFocus = useCallback(() => {
    innerMenuOpenRef.current = false;
    setOpen(false);
    restoreTriggerFocus();
  }, [restoreTriggerFocus]);

  useEffect(() => {
    if (!open) return;

    panelRef.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (innerMenuOpenRef.current) return;
      if (
        target instanceof Element &&
        target.closest('[data-qna-filter-select-menu]')
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (innerMenuOpenRef.current) return;
        const focusableElements = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);
        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
        return;
      }
      if (event.key !== 'Escape') return;
      if (innerMenuOpenRef.current) return;
      if (
        event.target instanceof Element &&
        event.target.closest('[data-qna-filter-select-menu]')
      )
        return;
      event.preventDefault();
      closeAndRestoreFocus();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAndRestoreFocus, open]);

  return (
    <>
      <div className="relative" ref={rootRef}>
        <Button
          aria-controls={popoverId}
          aria-expanded={open}
          aria-haspopup="dialog"
          color="outlined"
          icon={<SortLinesIcon className="h-150 w-225" />}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          size="large"
          type="button"
          className="shrink-0 whitespace-nowrap md:h-400 md:rounded-75 md:px-100 md:font-designer-14b"
        >
          필터
        </Button>
        {open && (
          <form
            aria-labelledby={`${popoverId}-title`}
            className="fixed inset-x-200 bottom-0 z-50 flex max-h-4000 flex-col gap-300 overflow-y-auto rounded-t-150 border border-border-subtle bg-background-default p-375 pb-[env(safe-area-inset-bottom)] shadow-2 md:absolute md:inset-x-auto md:right-0 md:top-full md:bottom-auto md:mt-50 md:w-4250 md:max-w-4250 md:rounded-200 md:pb-375"
            id={popoverId}
            onSubmit={(event) => {
              event.preventDefault();
              handleApply();
              restoreTriggerFocus();
            }}
            ref={panelRef}
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <span
                className="font-designer-18b text-gray-800"
                id={`${popoverId}-title`}
              >
                질문
              </span>
              <IconButton
                label="필터 닫기"
                onClick={closeAndRestoreFocus}
                size="xs"
                tone="ghost"
              >
                <CloseIcon className="size-250" />
              </IconButton>
            </div>

            <div className="flex flex-col gap-200">
              <Dropdown
                options={
                  curriculum
                    ? [
                        {
                          label: courseTitle,
                          value: curriculum.courseId,
                        },
                      ]
                    : []
                }
                value={curriculum?.courseId ?? null}
                placeholder="코스 선택"
                onOpenStateChange={handleInnerMenuOpenChange}
                onSelect={() => {}}
              />
              <Dropdown
                options={chapterOptions}
                value={selectedChapterId}
                placeholder="챕터 선택"
                onOpenStateChange={handleInnerMenuOpenChange}
                onSelect={(v) => {
                  setSelectedChapterId(v);
                  setSelectedLessonId(null);
                }}
              />
              <Dropdown
                options={lessonOptions}
                value={selectedLessonId}
                placeholder="레슨 선택"
                disabled={selectedChapterId === null}
                onOpenStateChange={handleInnerMenuOpenChange}
                onSelect={(v) => setSelectedLessonId(v)}
              />
            </div>

            <div className="flex items-center gap-200">
              <TextActionButton
                type="button"
                onClick={handleReset}
                icon={<RefreshIcon className="size-200" />}
                weight="bold"
                className="border-0 p-0 whitespace-nowrap font-designer-18b text-gray-800"
              >
                초기화
              </TextActionButton>
              <Button
                type="submit"
                color="primary"
                size="large"
                className="h-auto flex-1 py-200 font-designer-18b"
              >
                적용하기
              </Button>
            </div>
          </form>
        )}
      </div>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-background-dimmer md:hidden"
        />
      )}
    </>
  );
}
