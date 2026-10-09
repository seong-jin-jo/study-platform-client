'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import {
  CAREER_OPTIONS,
  JOB_ETC_VALUE,
  JOB_MAX_SELECT,
  JOB_OPTIONS,
} from '@/config/class-onboarding-const';
import type { JobValue, StepProps } from '../onboarding-types';

export function Step3JobCareer({
  data,
  updateData,
  onNext,
  isSubmitting,
}: StepProps) {
  const jobs = data.jobs;
  const isEtcSelected = jobs.includes(JOB_ETC_VALUE);
  // 재개 시 OTHER가 이미 선택돼 있으면 입력창을 열어둔다.
  const [etcMode, setEtcMode] = useState(isEtcSelected);
  const [etcInput, setEtcInput] = useState(data.jobEtcText ?? '');

  const atMax = jobs.length >= JOB_MAX_SELECT;
  const canProceed =
    jobs.length >= 1 &&
    (!isEtcSelected || !!data.jobEtcText?.trim()) &&
    !!data.career &&
    !isSubmitting;

  const toggleJob = (value: JobValue) => {
    if (jobs.includes(value)) {
      updateData(
        'jobs',
        jobs.filter((j) => j !== value),
      );
    } else if (!atMax) {
      updateData('jobs', [...jobs, value]);
    }
  };

  const handleEtcClick = () => {
    if (isEtcSelected) {
      updateData(
        'jobs',
        jobs.filter((j) => j !== JOB_ETC_VALUE),
      );
      updateData('jobEtcText', undefined);
      setEtcMode(false);
      setEtcInput('');
      return;
    }
    if (!atMax) setEtcMode(true);
  };

  const handleEtcAdd = () => {
    if (!etcInput.trim() || atMax) return;
    updateData('jobs', [...jobs, JOB_ETC_VALUE]);
    updateData('jobEtcText', etcInput.trim());
    setEtcMode(false);
  };

  const handleEtcCancel = () => {
    setEtcMode(false);
    if (!isEtcSelected) setEtcInput('');
  };

  return (
    <div className="flex flex-col gap-500">
      {/* Job section */}
      <div className="flex flex-col gap-150">
        <div className="flex items-baseline gap-150">
          <p className="font-designer-18b text-gray-800">
            해당되는 직무를 선택해주세요.
          </p>
          <span className="font-designer-14r text-gray-500">
            (최대 2개 선택)
          </span>
        </div>
        <p className="font-designer-14r text-gray-500">
          신규 코스 기획에 활용될 예정입니다.
        </p>
        <div className="flex flex-wrap gap-150 pt-150">
          {JOB_OPTIONS.map((jobItem) => {
            const selected = jobs.includes(jobItem.value);
            const disabled = !selected && atMax;
            return (
              <Button
                key={jobItem.value}
                type="button"
                color="outlined"
                size="xsmall"
                onClick={() => toggleJob(jobItem.value)}
                disabled={disabled}
                className={cn(
                  'h-auto rounded-full px-250 py-125 font-designer-16r transition-colors',
                  selected
                    ? 'border-transparent bg-rose-500 text-white hover:bg-rose-500 active:bg-rose-500'
                    : disabled
                      ? 'cursor-not-allowed border-gray-200 bg-white text-gray-300 disabled:bg-white disabled:text-gray-300'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-rose-300 hover:bg-white active:bg-white',
                )}
              >
                {jobItem.label}
              </Button>
            );
          })}
          <Button
            type="button"
            color="outlined"
            size="xsmall"
            onClick={handleEtcClick}
            disabled={!isEtcSelected && atMax}
            className={cn(
              'h-auto rounded-full px-250 py-125 font-designer-16r transition-colors',
              isEtcSelected
                ? 'border-rose-500 bg-white text-rose-500 hover:bg-white active:bg-white'
                : !isEtcSelected && atMax
                  ? 'cursor-not-allowed border-gray-200 bg-white text-gray-300 disabled:bg-white disabled:text-gray-300'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-rose-300 hover:bg-white active:bg-white',
            )}
          >
            기타+
          </Button>
          {etcMode && !isEtcSelected && (
            <div className="flex items-center gap-125 rounded-500 border border-rose-500 bg-white px-250 py-100">
              <input
                type="text"
                aria-label="기타 직무"
                value={etcInput}
                onChange={(e) => setEtcInput(e.target.value)}
                placeholder="입력해주세요"
                className="min-w-0 flex-1 bg-transparent font-designer-16r text-rose-500 outline-none placeholder:text-rose-200"
              />
              <div className="flex gap-75">
                <Button
                  type="button"
                  color="primary"
                  size="xsmall"
                  onClick={handleEtcAdd}
                  disabled={!etcInput.trim()}
                  className="rounded-50 px-125 font-designer-13m disabled:opacity-50"
                >
                  추가
                </Button>
                <Button
                  type="button"
                  color="secondary"
                  size="xsmall"
                  onClick={handleEtcCancel}
                  className="h-auto rounded-50 bg-rose-100 px-125 py-50 font-designer-13m text-rose-500 hover:bg-rose-100 active:bg-rose-100"
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Career section */}
      <div className="flex flex-col gap-150">
        <p className="font-designer-18b text-gray-800">
          해당되는 경력을 선택해주세요.
        </p>
        <div className="flex flex-col gap-150 pt-150">
          {CAREER_OPTIONS.map((careerItem) => (
            <Button
              key={careerItem.value}
              type="button"
              color="outlined"
              size="large"
              onClick={() => updateData('career', careerItem.value)}
              className={cn(
                'h-700 w-full justify-start rounded-150 px-300 text-left transition-colors duration-200 [&>span]:contents',
                data.career === careerItem.value
                  ? 'border-rose-500 bg-rose-50 font-designer-16b text-rose-500 hover:bg-rose-50 active:bg-rose-50'
                  : 'border-gray-300 bg-white font-designer-16r text-gray-500 hover:border-rose-300 hover:bg-white active:bg-white',
              )}
            >
              {careerItem.label}
            </Button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        type="button"
        color="primary"
        size="large"
        aria-busy={isSubmitting}
        onClick={onNext}
        disabled={!canProceed}
        className="h-700 w-full disabled:bg-gray-200 disabled:text-gray-400"
      >
        {isSubmitting ? <Loader2 className="size-300 animate-spin" /> : '다음'}
      </Button>
    </div>
  );
}
