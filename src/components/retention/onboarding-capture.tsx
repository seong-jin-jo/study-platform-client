'use client';

import { Check, ChevronRight, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import LoginModal from '@/components/auth/modals/login-modal';
import { trackGa4Event } from '@/components/common/analytics/ga4-events';
import PhoneVerificationModal from '@/components/common/modals/phone-verification-modal';
import Button from '@/components/common/ui/button';
import { RetentionPage } from '@/components/retention/retention-shell';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useRetentionOnboardingMutation } from '@/hooks/queries/retention/use-retention-queries';
import { useToastStore } from '@/stores/use-toast-store';
import { AUTH_SESSION_STATES } from '@/types/auth/domain';
import type { RoomGoalType } from '@/types/retention/contracts';
import { getAttributionData } from '@/utils/attribution-tracker';

const GOALS: Array<{
  value: RoomGoalType;
  title: string;
  description: string;
}> = [
  {
    value: 'WEBAPP_MONETIZATION',
    title: '웹앱 수익화',
    description: '만든 것을 실제 사용자에게 닿게 해요',
  },
  {
    value: 'WORK_AUTOMATION',
    title: '업무 자동화',
    description: '반복되는 일을 나만의 도구로 바꿔요',
  },
  {
    value: 'DESIGNER_VIBECODING',
    title: '디자이너의 바이브코딩',
    description: '화면 설계에서 실제 구현까지 이어가요',
  },
];

const CONSENT_CHANNELS = [
  { key: 'email', label: '이메일로 새 글과 프로그램 소식 받기' },
  { key: 'alerttalk', label: '알림톡으로 중요한 소식 받기' },
] as const;

export default function OnboardingCapture() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToastStore((state) => state.showToast);
  const { isHydrated, sessionState } = useAuthReady();
  const { mutate, isPending } = useRetentionOnboardingMutation();
  const [goal, setGoal] = useState<RoomGoalType>();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState<boolean | null>(null);
  const [alerttalkConsent, setAlerttalkConsent] = useState<boolean | null>(
    null,
  );
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [seminarAssignmentFailed, setSeminarAssignmentFailed] = useState(false);

  if (!isHydrated) {
    return (
      <RetentionPage>
        <p className="mx-auto max-w-5500 rounded-200 border border-gray-200 bg-white p-250 text-[14px] font-semibold text-gray-600">
          인증 상태를 확인하는 중이에요.
        </p>
      </RetentionPage>
    );
  }

  if (sessionState === AUTH_SESSION_STATES.ANONYMOUS) {
    return (
      <RetentionPage>
        <div className="mx-auto max-w-5500 rounded-300 border border-gray-200 bg-white p-300 text-center shadow-1 lg:p-600">
          <p className="text-[14px] font-bold text-rose-500">
            ZERO-ONE 시작하기
          </p>
          <h1 className="mt-125 text-[28px] font-bold tracking-[-0.8px]">
            로그인하고 목표 방에 합류하세요
          </h1>
          <p className="mt-150 text-[15px] leading-[1.6] text-gray-600">
            카카오 로그인 뒤 이메일과 관심 목표를 확인하면 방으로 연결해드려요.
          </p>
          <LoginModal
            openTrigger={
              <button
                type="button"
                className="mt-400 flex h-650 w-full items-center justify-center rounded-150 bg-[#fee500] text-[16px] font-bold text-[#191600]"
              >
                카카오 로그인으로 시작하기
              </button>
            }
          />
        </div>
      </RetentionPage>
    );
  }

  if (sessionState === AUTH_SESSION_STATES.PENDING_SIGNUP) {
    return (
      <RetentionPage>
        <div className="mx-auto max-w-5500 rounded-300 border border-gray-200 bg-white p-300 text-center shadow-1 lg:p-600">
          <h1 className="text-[24px] font-bold">회원가입을 먼저 마쳐주세요</h1>
          <p className="mt-150 text-[15px] leading-[1.6] text-gray-600">
            가입이 끝나면 목표 방 선택을 이어서 할 수 있어요.
          </p>
          <Link
            href="/class?onboarding=true"
            className="mt-400 flex h-650 w-full items-center justify-center rounded-150 bg-rose-500 text-[16px] font-bold text-white"
          >
            회원가입 계속하기
          </Link>
        </div>
      </RetentionPage>
    );
  }

  const submit = () => {
    if (!goal) {
      showToast('들어갈 목표 방을 하나 골라주세요.', 'error');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showToast('이메일 주소를 확인해주세요.', 'error');
      return;
    }
    const attribution = getAttributionData();
    const cohortCode = searchParams.get('cohort') ?? null;
    mutate(
      {
        roomGoalType: goal,
        email,
        phone,
        ...(emailConsent === null
          ? {}
          : { emailMarketingConsent: emailConsent }),
        ...(alerttalkConsent === null ? {} : { alerttalkConsent }),
        utmSource: attribution?.utm_source ?? null,
        utmMedium: attribution?.utm_medium ?? null,
        utmCampaign: attribution?.utm_campaign ?? null,
        cohortCode,
      },
      {
        onSuccess: (response) => {
          trackGa4Event('signup_complete');
          trackGa4Event('lead_submit');
          if (cohortCode && !response.seminarAssigned) {
            setSeminarAssignmentFailed(true);
            return;
          }
          showToast('목표 방에 연결했어요.', 'success');
          router.push('/');
        },
        onError: () =>
          showToast('저장하지 못했어요. 잠시 후 다시 시도해주세요.', 'error'),
      },
    );
  };

  if (seminarAssignmentFailed) {
    return (
      <RetentionPage>
        <div className="mx-auto max-w-5500 rounded-300 border border-yellow-200 bg-white p-300 text-center shadow-1 lg:p-600">
          <p className="text-[14px] font-bold text-yellow-700">
            자동 배정이 필요해요
          </p>
          <h1 className="mt-125 text-[28px] font-bold leading-[1.3] tracking-[-0.8px]">
            기수에 자동 배정되지 않았어요.
          </h1>
          <p className="mt-150 text-[15px] leading-[1.6] text-gray-600">
            목표 방 연결은 완료됐어요. 현장 스태프에게 이름을 알려주시면 기수
            배정을 도와드릴게요.
          </p>
          <Link
            href="/"
            className="mt-400 flex h-650 w-full items-center justify-center rounded-150 bg-rose-500 text-[16px] font-bold text-white"
          >
            홈으로 이동하기
          </Link>
        </div>
      </RetentionPage>
    );
  }

  return (
    <RetentionPage>
      <div className="mx-auto max-w-5500 rounded-300 border border-gray-200 bg-white p-300 shadow-1 lg:p-600">
        <p className="text-[14px] font-bold text-rose-500">
          ZERO-ONE 시작하기 · 마지막 단계
        </p>
        <h1 className="mt-125 text-[28px] font-bold leading-[1.3] tracking-[-0.8px] lg:text-[34px]">
          거의 다 왔어요.
          <br />
          들어갈 목표 방을 고르세요.
        </h1>
        <p className="mt-150 text-[15px] leading-[1.6] text-gray-600">
          같은 목표를 가진 사람들과, 오늘의 다음 행동을 이어가요.
        </p>
        <section className="mt-500">
          <h2 className="text-[17px] font-bold">목표 방 선택</h2>
          <div className="mt-200 grid gap-125">
            <>
              {GOALS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setGoal(item.value)}
                  className={
                    goal === item.value
                      ? 'flex min-h-700 items-center justify-between rounded-200 border-2 border-rose-500 bg-rose-50 p-200 text-left'
                      : 'flex min-h-700 items-center justify-between rounded-200 border border-gray-200 p-200 text-left hover:border-rose-300'
                  }
                >
                  <span>
                    <strong className="block text-[17px]">{item.title}</strong>
                    <span className="mt-50 block font-designer-13r text-gray-600">
                      {item.description}
                    </span>
                  </span>
                  {goal === item.value ? (
                    <span className="flex size-250 items-center justify-center rounded-full bg-rose-500 text-white">
                      <Check className="size-175" />
                    </span>
                  ) : (
                    <ChevronRight className="size-225 text-gray-400" />
                  )}
                </button>
              ))}
            </>
          </div>
        </section>
        <section className="mt-500 border-t border-gray-100 pt-400">
          <label htmlFor="retention-email" className="text-[17px] font-bold">
            안내받을 이메일
          </label>
          <input
            id="retention-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@email.com"
            className="mt-150 h-600 w-full rounded-150 border border-gray-300 px-200 text-[16px] outline-none focus:border-rose-500"
          />
          <button
            type="button"
            onClick={() => setPhoneModalOpen(true)}
            className="mt-150 flex min-h-550 w-full items-center justify-between rounded-150 bg-gray-50 px-200 text-left"
          >
            <span>
              <strong className="text-[14px]">전화번호 인증</strong>
              <span className="ml-100 font-designer-13r text-gray-600">
                {phone ? phone : '선택 · 기존 인증 흐름 사용'}
              </span>
            </span>
            <Phone className="size-200 text-gray-600" />
          </button>
        </section>
        <section className="mt-400 rounded-150 bg-gray-50 p-200">
          <p className="font-designer-13r leading-[1.5] text-gray-600">
            광고성 정보 수신은 선택이에요. 선택하지 않으면 기존 수신 설정을
            유지해요.
          </p>
          <div className="mt-175 grid gap-125">
            <>
              {CONSENT_CHANNELS.map((channel) => {
                const checked =
                  channel.key === 'email' ? emailConsent : alerttalkConsent;
                const setChecked =
                  channel.key === 'email'
                    ? setEmailConsent
                    : setAlerttalkConsent;
                return (
                  <button
                    key={channel.key}
                    type="button"
                    onClick={() => setChecked(checked !== true)}
                    className="flex min-h-400 items-center gap-125 text-left text-[14px]"
                  >
                    <span
                      className={
                        checked
                          ? 'flex size-200 items-center justify-center rounded-50 bg-rose-500 text-white'
                          : 'size-200 rounded-50 border border-gray-400'
                      }
                    >
                      {checked && <Check className="size-150" />}
                    </span>
                    {channel.label}
                  </button>
                );
              })}
            </>
          </div>
        </section>
        <Button
          type="button"
          color="primary"
          size="large"
          aria-busy={isPending}
          disabled={isPending}
          onClick={submit}
          className="mt-400 h-650 w-full rounded-150 disabled:bg-gray-300"
        >
          {isPending ? '연결하는 중…' : '목표 방으로 들어가기'}
        </Button>
      </div>
      <PhoneVerificationModal
        open={phoneModalOpen}
        onOpenChange={setPhoneModalOpen}
        onVerificationComplete={setPhone}
      />
    </RetentionPage>
  );
}
