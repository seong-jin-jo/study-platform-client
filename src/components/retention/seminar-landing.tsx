'use client';

import { Flame, Mail, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';

/* 05 세미나 QR 랜딩 (프로토타입 05-seminar-qr-landing.html 이식) — 정점-종점·실행의도·즉시성 */

const VALUES = [
  {
    Icon: Users,
    text: '오늘 같이 수업 들은 사람들의 기수 방 — 막히면 바로 물어봐요',
  },
  { Icon: Mail, text: '막힘을 미리 짚어주는 주 1회 인사이트' },
  { Icon: Flame, text: '혼자면 안 하니까 — 학습 스트릭이 다시 오게 불러줘요' },
];

export default function SeminarLanding({ code }: { code: string }) {
  return (
    <div className="flex min-h-screen justify-center bg-gray-50 px-250 py-400 lg:items-center lg:bg-gray-100">
      <div className="flex w-full max-w-5000 flex-col rounded-300 border border-gray-200 bg-white p-350 shadow-1 lg:p-500">
        <p className="text-[14px] font-black tracking-[-0.02em] text-gray-900">
          ZERO<span className="text-rose-500">-</span>ONE
        </p>
        <span className="mt-150 inline-flex w-fit items-center gap-75 rounded-full bg-green-50 px-150 py-75 font-designer-12b font-bold text-green-700">
          <span className="size-100 rounded-full bg-green-500 ring-2 ring-green-100" />{' '}
          지금 이 강의실에서 진행 중
        </span>

        <div className="mt-300">
          <span className="inline-block rounded-full bg-rose-50 px-150 py-75 font-designer-12b font-extrabold text-rose-700">
            {code || '7·25 강남 토요 클래스'}
          </span>
          <h1 className="mt-150 text-[30px] leading-[1.28] font-black tracking-[-0.03em]">
            오늘 만든 걸<br />
            집에서도 이어가요
          </h1>
          <p className="mt-175 text-[15px] leading-[1.7] text-gray-600">
            방금 <b className="text-gray-900">작동하는 걸 처음 만든</b> 그 감각,
            여기서 안 끊기게 붙잡아요. 가입 후 실제 배정 결과를 바로 알려드려요.
          </p>
        </div>

        <div className="mt-300 rounded-200 border border-gray-200 bg-gray-50 p-250">
          <p className="font-designer-13b font-extrabold text-gray-900">
            합류하면 이런 게 이어져요
          </p>
          <div className="mt-175 space-y-150">
            {VALUES.map((v) => (
              <div key={v.text} className="flex items-start gap-125">
                <span className="grid size-450 flex-none place-items-center rounded-full bg-white text-rose-500 shadow-1">
                  <v.Icon className="size-200" aria-hidden />
                </span>
                <span className="text-[13.5px] leading-[1.5] text-gray-700">
                  {v.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-350">
          <p className="text-center font-designer-12m font-semibold text-gray-500">
            ① 카카오 로그인 → ② 이메일 확인 →{' '}
            <b className="text-gray-900">③ 배정 결과 확인</b>
          </p>
          <Link
            href={`/onboarding/retention?cohort=${encodeURIComponent(code)}`}
            className="mt-150 flex h-650 w-full items-center justify-center gap-100 rounded-150 bg-[#fee500] text-[15.5px] font-black text-[#191600] transition-opacity hover:opacity-90"
          >
            <MessageSquare className="size-225" aria-hidden /> 카카오로 3초
            시작하기
          </Link>
          <Link
            href={`/onboarding/retention?cohort=${encodeURIComponent(code)}`}
            className="mt-125 flex h-550 w-full items-center justify-center rounded-150 border border-gray-300 bg-white text-[13.5px] font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            다른 방법으로 가입
          </Link>
          <p className="mt-150 text-center font-designer-12m leading-[1.5] font-medium text-gray-400">
            현장 가입 · 언제든 수신거부 · 3번의 탭으로 오늘의 작업을 내일로
          </p>
        </div>
      </div>
    </div>
  );
}
