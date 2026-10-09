'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Disclosure } from '@/components/common/ui/disclosure';
import ToggleButton from '@/components/common/ui/toggle/button';
import { SCENARIOS, type Scenario, type ScenarioStatus } from './scenarios';

const STORAGE_KEY = 'qa-scenario-progress';

type ProgressMap = Record<string, boolean[]>;

const STATUS_META: Record<
  ScenarioStatus,
  { label: string; dot: string; className: string }
> = {
  ready: { label: '구현완료', dot: '🟢', className: 'text-[#067647]' },
  partial: { label: '부분 가능', dot: '🟡', className: 'text-[#B54708]' },
  blocked: { label: '구현 대기', dot: '⚪', className: 'text-text-subtle' },
};

function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function checkedCount(steps: boolean[] | undefined) {
  return steps?.filter(Boolean).length ?? 0;
}

function ScenarioCard({
  scenario,
  checks,
  open,
  onToggleOpen,
  onToggleStep,
  onReset,
}: {
  scenario: Scenario;
  checks: boolean[];
  open: boolean;
  onToggleOpen: () => void;
  onToggleStep: (stepIndex: number) => void;
  onReset: () => void;
}) {
  const total = scenario.steps.length;
  const done = checkedCount(checks);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const status = STATUS_META[scenario.status];

  return (
    <Disclosure.Group
      type="single"
      value={open ? ['scenario'] : []}
      onValueChange={onToggleOpen}
    >
      <Disclosure.Item
        value="scenario"
        className="rounded-150 border-border-default"
      >
        <Disclosure.Header className="gap-150 p-200">
          <span className="font-designer-13m text-text-subtlest shrink-0">
            {scenario.id}
          </span>
          <span className="font-designer-16b text-text-default min-w-0 flex-1 truncate">
            {scenario.title}
          </span>
          <span className={cn('font-designer-13m shrink-0', status.className)}>
            {status.dot} {status.label}
          </span>
          <span className="font-designer-13m text-text-subtle shrink-0">
            {done}/{total}
          </span>
        </Disclosure.Header>

        {/* 진행률 바 */}
        <div className="bg-gray-100 mx-200 h-25 overflow-hidden rounded-full">
          <div
            className="bg-background-brand-default h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        <Disclosure.Panel className="flex flex-col gap-150 p-200">
          <div className="flex flex-wrap items-center gap-100">
            <span className="font-designer-12r text-text-subtle">
              담당: {scenario.persona}
            </span>
            {scenario.statusReason && (
              <span className="font-designer-12r text-text-subtlest">
                · {scenario.statusReason}
              </span>
            )}
          </div>

          {scenario.preconditions.length > 0 && (
            <div className="bg-gray-100 rounded-100 flex flex-col gap-50 p-150">
              <span className="font-designer-12m text-text-subtle">
                시작 전 준비물
              </span>
              <ul className="flex flex-col gap-25">
                {scenario.preconditions.map((pre, i) => (
                  <li
                    key={i}
                    className="font-designer-13r text-text-default before:content-['·_']"
                  >
                    {pre}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="flex flex-col gap-100">
            {scenario.steps.map((step, i) => {
              const isChecked = checks[i] ?? false;
              return (
                <li
                  key={i}
                  className={cn(
                    'border-border-subtle rounded-100 flex gap-150 border p-150',
                    isChecked && 'bg-rose-50',
                  )}
                >
                  <label className="flex shrink-0 items-start gap-100">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleStep(i)}
                      aria-label={`${i + 1}단계 완료`}
                      className="mt-25 size-200 accent-rose-500"
                    />
                    <span className="font-designer-14b text-text-default">
                      {i + 1}
                    </span>
                  </label>
                  <div className="flex min-w-0 flex-1 flex-col gap-25">
                    <span className="font-designer-12r text-text-subtlest">
                      📍 {step.where}
                    </span>
                    <span className="font-designer-14m text-text-default">
                      {step.action}
                    </span>
                    {step.input && (
                      <span className="font-designer-13r text-text-subtle">
                        ⌨️ 입력: {step.input}
                      </span>
                    )}
                    <span className="font-designer-13r text-[#067647]">
                      ✅ 통과: {step.expect}
                    </span>
                    {step.fail && (
                      <span className="font-designer-13r text-[#D92D20]">
                        ❌ 실패: {step.fail}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex justify-end">
            <Button color="outlined" size="small" onClick={onReset}>
              이 시나리오 체크 초기화
            </Button>
          </div>
        </Disclosure.Panel>
      </Disclosure.Item>
    </Disclosure.Group>
  );
}

export default function QaScenariosPageClient() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [featureFilter, setFeatureFilter] = useState<string>('전체');

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const persist = (next: ProgressMap) => {
    setProgress(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage 불가 환경 — 메모리 상태만 유지
    }
  };

  const features = useMemo(() => {
    const set = new Set(SCENARIOS.map((s) => s.feature));
    return ['전체', ...Array.from(set)];
  }, []);

  const visible = useMemo(
    () =>
      featureFilter === '전체'
        ? SCENARIOS
        : SCENARIOS.filter((s) => s.feature === featureFilter),
    [featureFilter],
  );

  const toggleStep = (scenario: Scenario, stepIndex: number) => {
    const current =
      progress[scenario.id] ?? new Array(scenario.steps.length).fill(false);
    const next = [...current];
    next[stepIndex] = !next[stepIndex];
    persist({ ...progress, [scenario.id]: next });
  };

  const resetScenario = (scenarioId: string) => {
    const next = { ...progress };
    delete next[scenarioId];
    persist(next);
  };

  const totalSteps = SCENARIOS.reduce((sum, s) => sum + s.steps.length, 0);
  const doneSteps = SCENARIOS.reduce(
    (sum, s) => sum + checkedCount(progress[s.id]),
    0,
  );

  return (
    <main className="flex flex-col gap-200 p-200">
      <header className="flex flex-col gap-75">
        <h1 className="font-designer-24b text-text-default">
          QA 테스트 시나리오
        </h1>
        <p className="font-designer-14r text-text-subtle">
          DEV/스테이징 전용. 기능별 테스트 대본을 한 단계씩 따라 하며
          체크하세요. 누구든 이 화면만 보고 「어디서 → 무엇을 → 무엇이 보이면
          통과」를 그대로 실행할 수 있습니다. 체크 상태는 이 브라우저에
          저장됩니다.
        </p>
        <p className="font-designer-13m text-text-subtle">
          전체 진행: {doneSteps}/{totalSteps} 단계
        </p>
      </header>

      <div className="flex flex-wrap gap-100">
        {features.map((f) => (
          <ToggleButton
            key={f}
            pressed={featureFilter === f}
            onPressedChange={() => setFeatureFilter(f)}
            size="sm"
            variant="round"
            className={cn(
              'rounded-full border px-200 py-75 font-designer-13m transition-colors',
              featureFilter === f
                ? 'data-[state=on]:border-border-brand data-[state=on]:bg-rose-50 data-[state=on]:text-text-brand'
                : 'data-[state=off]:border-border-default data-[state=off]:bg-transparent data-[state=off]:text-text-subtle',
            )}
          >
            {f}
          </ToggleButton>
        ))}
      </div>

      <div className="flex flex-col gap-150">
        {visible.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            checks={
              progress[scenario.id] ??
              new Array(scenario.steps.length).fill(false)
            }
            open={openId === scenario.id}
            onToggleOpen={() =>
              setOpenId((prev) => (prev === scenario.id ? null : scenario.id))
            }
            onToggleStep={(stepIndex) => toggleStep(scenario, stepIndex)}
            onReset={() => resetScenario(scenario.id)}
          />
        ))}
      </div>
    </main>
  );
}
