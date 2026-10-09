'use client';

import {
  BookOpen,
  Check,
  Clock,
  Flame,
  RotateCcw,
  Snowflake,
  Sprout,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { RetentionPage } from '@/components/retention/retention-shell';
import { useStreakQuery } from '@/hooks/queries/retention/use-retention-queries';
import type { StreakStatus } from '@/types/retention/contracts';

/* 02 스트릭 위젯 (프로토타입 02-streak-widget.html 이식) — 손실회피·목표구배·Zeigarnik */

const EXAMPLE_STREAK: StreakStatus = {
  streakCount: 6,
  todayCompleted: false,
  week: [
    { date: '월', done: true },
    { date: '화', done: true },
    { date: '수', done: true },
    { date: '목', done: true },
    { date: '금', done: true },
    { date: '토', done: false },
    { date: '일', done: false },
  ],
  freezeCount: 1,
  nextMilestone: 7,
  milestoneReached: [3],
  atRisk: true,
};

const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MILESTONES: Array<{ day: 3 | 7 | 14; Icon: LucideIcon }> = [
  { day: 3, Icon: Sprout },
  { day: 7, Icon: Flame },
  { day: 14, Icon: Trophy },
];

export default function StreakPage() {
  const { data, isError, refetch } = useStreakQuery();
  const streak = data ?? EXAMPLE_STREAK;

  const broken = streak.streakCount === 0;
  const risk = !broken && streak.atRisk && !streak.todayCompleted;
  const todayIdx = Math.min(
    streak.week.findIndex((d) => !d.done) === -1
      ? streak.week.length - 1
      : streak.week.findIndex((d) => !d.done),
    6,
  );

  const greet = broken
    ? '다시 시작해요'
    : risk
      ? '오늘 아직 안 왔어요'
      : streak.todayCompleted
        ? '오늘도 이어가고 있어요'
        : '오늘도 한 칸씩';
  const message = broken
    ? '어제 하루를 놓쳐 스트릭이 리셋됐어요. 괜찮아요, 오늘부터 다시 1일.'
    : risk
      ? '스트릭이 오늘 끊길 수 있어요. 자정까지 1강만 들으면 그대로 이어져요.'
      : streak.todayCompleted
        ? streak.nextMilestone
          ? `딱 ${streak.nextMilestone - streak.streakCount}일이면 ${streak.nextMilestone}일 마일스톤! 오늘 학습을 마쳤어요.`
          : '오늘 학습을 마쳤어요. 내일도 만나요.'
        : '오늘 1강만 들으면 이번 주도 그대로 지켜요.';

  return (
    <RetentionPage>
      {isError && (
        <div className="mb-200 flex w-full items-center justify-between gap-200 rounded-200 border border-gray-200 bg-white px-200 py-150">
          <div>
            <strong className="block font-designer-12b font-bold text-gray-800">
              최신 스트릭을 못 불러왔어요.
            </strong>
            <span className="font-designer-12m font-semibold text-gray-600">
              아래에는 예시 데이터를 보여드려요.
            </span>
          </div>
          <Button
            type="button"
            color="outlined"
            size="xsmall"
            onClick={() => refetch()}
          >
            다시 시도
          </Button>
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[1.04fr_0.96fr] lg:items-start lg:gap-350">
        {/* 스트릭 히어로 */}
        <section
          className={cn(
            'relative overflow-hidden rounded-300 p-350 text-text-inverse lg:p-500',
            broken
              ? 'bg-linear-to-br from-gray-800 to-gray-700'
              : 'bg-linear-to-br from-orange-500 to-rose-500',
          )}
        >
          {!broken && (
            <div
              className="absolute inset-0 z-0 bg-background-dimmer/50"
              aria-hidden
            />
          )}
          {streak.freezeCount > 0 && !broken && (
            <span className="absolute top-250 right-250 z-10 inline-flex items-center gap-75 rounded-full bg-background-dimmer/25 px-150 py-75 font-designer-12b font-extrabold backdrop-blur-sm">
              <Snowflake className="size-150" aria-hidden /> 프리즈{' '}
              {streak.freezeCount}
            </span>
          )}
          <div className="relative z-10 flex items-end gap-175">
            <Flame
              className={cn('size-500', broken && 'opacity-60')}
              aria-hidden
            />
            <div>
              <strong className="block text-[54px] leading-none font-black tracking-[-0.03em] tabular-nums">
                {broken ? 0 : streak.streakCount}
              </strong>
              <span className="text-[15px] font-bold text-text-inverse">
                일 연속 학습
              </span>
            </div>
          </div>
          <p className="relative z-10 mt-125 text-[16px] font-black tracking-[-0.02em]">
            {greet}
          </p>
          <p className="relative z-10 mt-100 text-[14px] leading-[1.6] font-medium text-text-inverse">
            {message}
          </p>
          <div className="relative z-10 mt-350 grid grid-cols-7 gap-75">
            {WEEK_LABELS.map((label, index) => {
              const done = streak.week[index]?.done && !broken;
              const isToday = index === todayIdx;
              return (
                <div key={label} className="flex flex-col items-center gap-75">
                  <span
                    className={cn(
                      'grid aspect-square w-full place-items-center rounded-full font-designer-12b font-black',
                      done
                        ? 'bg-background-default text-text-brand-strong'
                        : isToday
                          ? 'border-2 border-dashed border-border-inverse/70 text-text-inverse'
                          : 'bg-background-dimmer/25 text-text-inverse',
                    )}
                  >
                    {done ? <Check className="size-175" aria-hidden /> : '·'}
                  </span>
                  <span className="font-designer-12b font-bold text-text-inverse">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 사이드: 오늘 할 것 + 마일스톤 + 프리즈 */}
        <div className="mt-250 flex flex-col gap-200 lg:mt-0">
          <CtaCard
            broken={broken}
            risk={risk}
            completed={streak.todayCompleted}
          />

          <div className="rounded-250 border border-gray-200 bg-white p-300">
            <p className="mb-200 font-designer-12b font-black tracking-[0.06em] text-gray-400 uppercase">
              마일스톤
            </p>
            <div className="flex items-center">
              {MILESTONES.map((m, i) => {
                const reached = streak.streakCount >= m.day && !broken;
                const isNext = m.day === streak.nextMilestone && !broken;
                return (
                  <div
                    key={m.day}
                    className="flex flex-1 items-center last:flex-none"
                  >
                    <div className="flex flex-col items-center gap-75">
                      <span
                        className={cn(
                          'grid size-500 place-items-center rounded-full text-[16px]',
                          reached
                            ? 'bg-rose-500 text-white'
                            : isNext
                              ? 'bg-rose-50 text-rose-500 ring-2 ring-rose-200'
                              : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        <m.Icon className="size-250" aria-hidden />
                      </span>
                      <span className="font-designer-12b font-extrabold">
                        {m.day}일
                      </span>
                      <span
                        className={cn(
                          'font-designer-12b font-bold',
                          reached
                            ? 'text-green-700'
                            : isNext
                              ? 'text-rose-600'
                              : 'text-gray-400',
                        )}
                      >
                        {reached
                          ? '달성'
                          : isNext
                            ? streak.nextMilestone
                              ? `D-${streak.nextMilestone - streak.streakCount}`
                              : '다음'
                            : '잠김'}
                      </span>
                    </div>
                    {i < MILESTONES.length - 1 && (
                      <span className="mx-100 mb-450 h-50 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className={cn(
                            'block h-full rounded-full bg-rose-500',
                            streak.streakCount >= MILESTONES[i + 1].day
                              ? 'w-full'
                              : reached
                                ? 'w-1/2'
                                : 'w-0',
                          )}
                        />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-200 font-designer-13r leading-[1.5] text-gray-600">
              {broken
                ? '프리즈를 다 썼어요. 3일 연속이면 새 프리즈 1개를 드려요.'
                : streak.nextMilestone
                  ? `${streak.nextMilestone}일 마일스톤까지 ${streak.nextMilestone - streak.streakCount}일 남았어요. 달성하면 다음 기수 우선 초대!`
                  : '숫자가 아니라, 내 리듬을 지키는 작은 약속이에요.'}
            </p>
          </div>

          <div className="rounded-250 border border-gray-200 bg-white p-300">
            <div className="flex items-center gap-100">
              <Snowflake className="size-225 text-blue-500" aria-hidden />
              <strong className="text-[14px]">
                스트릭 프리즈 {streak.freezeCount}개
              </strong>
            </div>
            <p className="mt-100 font-designer-13r leading-[1.5] text-gray-600">
              3일 연속 기록하면 무료 프리즈가 생겨요. 하루 놓쳐도 스트릭을
              지켜줘요.
            </p>
          </div>
        </div>
      </div>
    </RetentionPage>
  );
}

function CtaCard({
  broken,
  risk,
  completed,
}: {
  broken: boolean;
  risk: boolean;
  completed: boolean;
}) {
  const Ico = broken ? Sprout : risk ? Clock : completed ? BookOpen : BookOpen;
  const title = broken
    ? '오늘부터 다시 1일 쌓기'
    : risk
      ? '오늘 학습하면 스트릭 유지'
      : completed
        ? '오늘 학습 완료'
        : '오늘 학습하고 기록하기';
  const desc = broken
    ? '가장 큰 관문은 이미 지났어요 — 다시 앉는 것'
    : risk
      ? 'L12 · 딱 8분이면 끝나는 짧은 강의예요'
      : 'L12 · 카카오 로그인 리다이렉트 뜯어보기';
  const go = broken ? '시작' : risk ? '지금 1강' : completed ? '복습' : '학습';
  return (
    <Link
      href="/insights"
      className={cn(
        'flex items-center gap-175 rounded-250 border p-300 transition-colors',
        risk
          ? 'border-orange-200 bg-orange-50'
          : 'border-gray-200 bg-white hover:border-rose-300',
      )}
    >
      <span
        className={cn(
          'grid size-500 flex-none place-items-center rounded-150 text-white',
          risk
            ? 'bg-orange-500'
            : broken
              ? 'bg-linear-to-br from-orange-500 to-rose-500'
              : 'bg-rose-500',
        )}
      >
        {broken ? (
          <RotateCcw className="size-250" aria-hidden />
        ) : (
          <Ico className="size-250" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[15px] font-extrabold tracking-[-0.02em]">
          {title}
        </strong>
        <span className="mt-25 block font-designer-12m font-medium text-gray-600">
          {desc}
        </span>
      </span>
      <span
        className={cn(
          'grid h-450 flex-none place-items-center rounded-125 px-175 font-designer-13b font-bold text-white',
          risk ? 'bg-orange-500' : 'bg-rose-500',
        )}
      >
        {go}
      </span>
    </Link>
  );
}
