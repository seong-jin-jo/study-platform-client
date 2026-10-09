'use client';

import { ArrowRight, Check, Flame, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

export { default as AvatarStack } from '@/components/common/ui/avatar-stack';

export function RetentionPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:bg-gray-100">
      <div className="mx-auto w-full max-w-6000 px-200 py-400 lg:max-w-10700 lg:px-500 lg:py-700">
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-250 flex flex-wrap items-center gap-x-150 gap-y-75">
      <span className="size-100 rounded-full bg-rose-500" />
      <h2 className="text-[20px] font-bold tracking-[-0.5px]">{children}</h2>
      {hint && <span className="font-designer-13r text-gray-500">{hint}</span>}
    </div>
  );
}

export function StreakCard({
  count,
  atRisk,
  completed,
}: {
  count: number;
  atRisk: boolean;
  completed: boolean;
}) {
  return (
    <Link
      href="/streak"
      className="group rounded-250 border border-rose-200 bg-rose-50 p-250 transition-transform hover:-translate-y-25"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-designer-13m font-medium text-rose-700">
            오늘 할 것
          </p>
          <p className="mt-75 text-[22px] font-bold tracking-[-0.5px]">
            {completed
              ? '오늘도 기록했어요'
              : atRisk
                ? '오늘 끊길 수 있어요'
                : '스트릭을 이어가요'}
          </p>
        </div>
        <Flame className="size-400 text-rose-500" aria-hidden />
      </div>
      <div className="mt-250 flex items-end justify-between">
        <strong className="text-[30px] leading-none text-rose-600">
          {count}일
        </strong>
        <span className="flex items-center gap-50 font-designer-13m font-semibold text-rose-700">
          자세히 <ArrowRight className="size-175" />
        </span>
      </div>
    </Link>
  );
}

const FACE_TONES = [
  'bg-rose-50 text-rose-700',
  'bg-blue-50 text-blue-700',
  'bg-green-50 text-green-700',
] as const;

/** 겹친 얼굴 스택 — 관심축 사회적 증거(동종선호). 이름 이니셜 + 선택적 잔여 카운트 pill. */
export function Faces({
  names,
  extra,
  size = 'md',
}: {
  names: string[];
  extra?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg'
      ? 'size-350 font-designer-12r'
      : size === 'sm'
        ? 'size-250 font-designer-12b'
        : 'size-275 font-designer-12r';
  return (
    <div className="flex" aria-hidden>
      {names.slice(0, 3).map((name, index) => (
        <span
          key={name}
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-white font-black first:ml-0 -ml-75',
            box,
            FACE_TONES[index % FACE_TONES.length],
          )}
        >
          {name.slice(0, 1)}
        </span>
      ))}
      {extra && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-white bg-gray-100 font-black text-gray-600 -ml-75',
            box,
          )}
        >
          {extra}
        </span>
      )}
    </div>
  );
}

export function StatusCheck({
  done,
  children,
}: {
  done: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-100 font-designer-13r',
        done ? 'text-green-700' : 'text-gray-500',
      )}
    >
      <span
        className={cn(
          'flex size-175 items-center justify-center rounded-full',
          done ? 'bg-green-100' : 'bg-gray-100',
        )}
      >
        <Check className="size-125" />
      </span>
      {children}
    </span>
  );
}

export function CommunityIcon() {
  return <Users className="size-200 text-rose-500" aria-hidden />;
}
