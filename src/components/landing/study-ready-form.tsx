'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import Checkbox from '@/components/common/ui/checkbox';
import TextActionButton from '@/components/common/ui/text-action-button';
import ToggleButton from '@/components/common/ui/toggle/button';
import { useToastStore } from '@/stores/use-toast-store';
import { analyzeError } from '@/utils/error-handler';

/* ─── Course options (Figma 1782:10769) ─────────────── */

const COURSE_OPTIONS = [
  '웹을 넘어 앱으로, 바이브 코딩 앱 런칭편',
  '일잘러의 비밀 무기, 맞춤형 스크래핑 및 루틴 자동화 툴',
  "화면 설계에서 멈추지 않는 '실제 구현' 바이브",
  '반복 루틴 박살내기, 마케팅/데이터 자동화 바이브',
  '기획서 대신 워킹 모델로 설득하기',
  '엔지니어의 무기, AI 페어 프로그래밍과 리팩토링',
] as const;

const CONCERN_PLACEHOLDER =
  "예) 프로토파이로 복잡한 쿠폰 발급 로직이나 구매 플로우를 아무리 화려하게 설계해도, 막상 개발자분들께 보여주면 '시간이 너무 걸린다', '구조상 어렵다'는 크리틱을 받을 때가 많아 답답합니다. 제 머릿속에 있는 디자인 시스템을 다른 사람의 손을 빌리지 않고 직접 라이브 서버에 띄워보고 싶은데, 코딩 쌩초보도 바이브 코딩으로 구현할 수 있을까요?";

/* ─── Schema ─────────────────────────────────────────── */
// Standalone schema — no backend survey DTO exists yet (live swagger has no
// survey-submit endpoint). When the endpoint ships, import its Request DTO and
// add a transformer per schema-validation.md.

const StudyReadyFormSchema = z
  .object({
    courses: z.array(z.string()),
    customCourses: z.array(z.string()),
    concern: z.string(),
    email: z.string().email('올바른 이메일 형식이 아니에요.'),
    agree: z.boolean().refine((v) => v === true, {
      message: '개인정보 이용약관에 동의해주세요.',
    }),
    marketingConsent: z.boolean(),
  })
  .refine((v) => v.courses.length + v.customCourses.length > 0, {
    path: ['courses'],
    message: '관심 있는 코스를 하나 이상 선택해주세요.',
  });

type StudyReadyFormValues = z.infer<typeof StudyReadyFormSchema>;

/* ─── Pill chip ──────────────────────────────────────── */

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ToggleButton
      pressed={selected}
      onPressedChange={onClick}
      color="primary"
      size="lg"
      variant="round"
      className={cn(
        'whitespace-normal rounded-full border px-375 py-125 text-left text-[14px] leading-[1.5] tracking-[-0.304px] transition-colors md:text-[16px]',
        selected
          ? 'font-bold data-[state=on]:border-rose-500 data-[state=on]:bg-white data-[state=on]:text-rose-500'
          : 'font-medium data-[state=off]:border-gray-400 data-[state=off]:bg-transparent data-[state=off]:text-gray-600 hover:border-rose-300',
      )}
    >
      {label}
    </ToggleButton>
  );
}

/* ─── Form ───────────────────────────────────────────── */

export function StudyReadyForm() {
  const showToast = useToastStore((s) => s.showToast);

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StudyReadyFormValues>({
    resolver: zodResolver(StudyReadyFormSchema),
    defaultValues: {
      courses: [],
      customCourses: [],
      concern: '',
      email: '',
      agree: false,
      marketingConsent: false,
    },
  });

  const courses = watch('courses');
  const customCourses = watch('customCourses');
  const agree = watch('agree');
  const marketingConsent = watch('marketingConsent');

  const toggleCourse = (label: string) => {
    setValue(
      'courses',
      courses.includes(label)
        ? courses.filter((c) => c !== label)
        : [...courses, label],
      { shouldValidate: true },
    );
  };

  const addCustom = () => {
    const value = customDraft.trim();
    if (!value) return;
    setValue('customCourses', [...customCourses, value], {
      shouldValidate: true,
    });
    setCustomDraft('');
    setShowCustomInput(false);
  };

  const removeCustom = (value: string) => {
    setValue(
      'customCourses',
      customCourses.filter((c) => c !== value),
      { shouldValidate: true },
    );
  };

  const submitMutation = useMutation({
    mutationFn: async (values: StudyReadyFormValues) => {
      const response = await fetch('/api/study-ready-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courses: [...values.courses, ...values.customCourses],
          concern: values.concern,
          email: values.email,
          agree: values.agree,
          marketingConsent: values.marketingConsent,
        }),
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          responseBody?.error ??
            '신청을 제출하지 못했습니다. 잠시 후 다시 시도해주세요.',
        );
      }
    },
    onSuccess: () => {
      showToast(
        '소중한 의견 감사합니다! 코스 오픈 시 가장 먼저 알려드릴게요.',
        'success',
      );
      reset();
      setCustomDraft('');
      setShowCustomInput(false);
    },
    onError: (error) => {
      const errorInfo = analyzeError(error);
      showToast(errorInfo.userMessage, 'error');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: StudyReadyFormValues) => {
    setIsSubmitting(true);
    submitMutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full flex-col gap-500 rounded-500 bg-white px-300 py-400 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.2)] md:px-625 md:py-750"
    >
      {/* Q1 — course selection */}
      <fieldset className="flex flex-col gap-250">
        <legend className="flex gap-125 text-[16px] leading-[1.5] tracking-[-0.38px] md:text-[20px]">
          <span className="shrink-0 font-bold text-rose-500">Q1</span>
          <span className="text-gray-800">
            제로원에서 배우고 싶은 코스가 있다면 어떤것이 좋을지 선택해주세요.
          </span>
        </legend>

        <div className="flex flex-wrap gap-250">
          {COURSE_OPTIONS.map((label) => (
            <Chip
              key={label}
              label={label}
              selected={courses.includes(label)}
              onClick={() => toggleCourse(label)}
            />
          ))}

          {/* Added custom entries render as removable selected chips */}
          {customCourses.map((label) => (
            <Chip
              key={label}
              label={label}
              selected
              onClick={() => removeCustom(label)}
            />
          ))}

          {/* 기타(직접작성하기) toggle */}
          <Chip
            label="기타(직접작성하기)"
            selected={showCustomInput}
            onClick={() => setShowCustomInput((v) => !v)}
          />
        </div>

        {showCustomInput && (
          <div className="flex flex-wrap items-center gap-250 rounded-full border border-gray-400 px-375 py-125">
            <input
              type="text"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="내용을 기재해주세요."
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-[1.5] tracking-[-0.304px] text-gray-800 placeholder:text-gray-600 focus:outline-none md:text-[16px]"
            />
            <div className="flex items-center gap-100">
              <Button
                type="button"
                color="outlined"
                size="xsmall"
                onClick={addCustom}
              >
                추가
              </Button>
              <Button
                type="button"
                color="outlined"
                size="xsmall"
                onClick={() => {
                  setCustomDraft('');
                  setShowCustomInput(false);
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {errors.courses && (
          <p className="font-designer-13r text-rose-500">
            {errors.courses.message}
          </p>
        )}
      </fieldset>

      {/* Q2 — free-form concern */}
      <div className="flex flex-col gap-250">
        <label
          htmlFor="study-ready-concern"
          className="text-[16px] leading-[1.5] tracking-[-0.38px] text-gray-800 md:text-[20px]"
        >
          바이브 코딩에 대해 고민이 있으신가요? 자유롭게 적어주세요. 많은 고민을
          하며 돕겠습니다.
        </label>
        <textarea
          id="study-ready-concern"
          {...register('concern')}
          placeholder={CONCERN_PLACEHOLDER}
          className="min-h-2850 w-full resize-none rounded-100 border border-gray-300 px-300 py-175 text-[16px] leading-[1.6] tracking-[-0.304px] text-gray-800 placeholder:text-gray-500 focus:border-rose-500 focus:outline-none"
        />
      </div>

      {/* Q3 — email */}
      <div className="flex flex-col gap-250">
        <label
          htmlFor="study-ready-email"
          className="text-[16px] leading-[1.5] tracking-[-0.38px] text-black md:text-[20px]"
        >
          후속 코스 오픈 시 안내 받을 이메일 주소를 입력해 주세요.
        </label>
        <input
          id="study-ready-email"
          type="email"
          {...register('email')}
          placeholder="이메일을 입력해주세요"
          className="w-full rounded-100 border border-gray-300 px-300 py-175 text-[16px] leading-[1.5] tracking-[-0.342px] text-gray-800 placeholder:text-gray-400 focus:border-rose-500 focus:outline-none md:text-[18px]"
        />
        {errors.email && (
          <p className="font-designer-13r text-rose-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Privacy agreement */}
      <div className="flex flex-col gap-125">
        <div className="flex items-center justify-between">
          <Checkbox
            id="study-ready-required-consent"
            checked={agree}
            onToggle={() =>
              setValue('agree', !agree, {
                shouldValidate: true,
              })
            }
            themeColor="rose-500"
            label={
              <span className="flex items-center gap-50 text-[16px] font-bold leading-[1.5] tracking-[-0.304px] text-gray-800">
                <span>개인정보 이용약관 동의</span>
                <span>(필수)</span>
              </span>
            }
          />

          <TextActionButton
            type="button"
            onClick={() => showToast('약관 페이지 준비 중이에요.', 'info')}
            weight="bold"
            className="border-0 p-0 text-[16px] font-bold leading-[1.5] tracking-[-0.304px] text-rose-500 underline hover:text-rose-500"
          >
            보기
          </TextActionButton>
        </div>
        {errors.agree && (
          <p className="font-designer-13r text-rose-500">
            {errors.agree.message}
          </p>
        )}
      </div>

      {/* Optional marketing email consent */}
      <div className="flex flex-col gap-125">
        <Checkbox
          id="study-ready-marketing-consent"
          checked={marketingConsent}
          onToggle={() =>
            setValue('marketingConsent', !marketingConsent, {
              shouldValidate: true,
            })
          }
          themeColor="rose-500"
          label={
            <span className="flex flex-col text-[16px] leading-[1.5] tracking-[-0.304px] text-gray-800">
              <span className="font-bold">마케팅 정보 수신 동의 (선택)</span>
              <span className="font-medium text-gray-600">
                코스 오픈과 ZERO-ONE 소식을 이메일로 받아볼게요.
              </span>
            </span>
          }
          className="w-full text-left"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        color="primary"
        size="large"
        disabled={isSubmitting}
        className="h-625 w-full text-[14px] font-bold leading-[1.5] tracking-[-0.266px] hover:bg-rose-600 disabled:bg-gray-400"
      >
        {isSubmitting ? '제출 중...' : '제출하기'}
      </Button>
    </form>
  );
}
