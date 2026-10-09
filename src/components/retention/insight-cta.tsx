import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Mail,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Faces } from '@/components/retention/retention-shell';

/* ────────────────────────────────────────────────────────────────────────
 * 04 인사이트 CTA / 다음 글 도어웨이 (프로토타입 04-insight-cta.html 이식)
 * ⚠️ 읽기예산 잠금 플래그 OFF: 3갈래 "다음 글"은 plain link — 포인트 잠금·XP·뱃지 없음.
 * 세그먼트형 사회적 증거(관심축)만 유지. 수치는 예시 데이터.
 * ──────────────────────────────────────────────────────────────────────── */

type BranchTone = 'next' | 'cs' | 'series';
const BRANCH_TAG: Record<BranchTone, string> = {
  next: 'bg-rose-50 text-rose-700',
  cs: 'bg-blue-50 text-blue-700',
  series: 'bg-gray-100 text-gray-700',
};

const BRANCHES: Array<{
  tone: BranchTone;
  tag: string;
  reco?: boolean;
  title: string;
  peek: string;
  series?: { pct: number; label: string };
}> = [
  {
    tone: 'next',
    tag: '다음 글 · 중급',
    reco: true,
    title: '카카오 로그인은 됐는데 배포에서만 깨질 때',
    peek: '로컬에선 콜백이 오는데 배포 도메인에서만 리다이렉트가 끊기는 이유를 순서대로 짚어요.',
  },
  {
    tone: 'cs',
    tag: 'CS 기초',
    title: 'OAuth가 대체 뭐길래 — 남의 집 열쇠 안 주고 문 열기',
    peek: 'redirect URI가 왜 필요한지, 토큰이 오가는 순서를 그림 한 장으로 정리했어요.',
  },
  {
    tone: 'series',
    tag: '시리즈 · 막힘 사전',
    title: '04편 — 결제는 성공인데 웹훅이 안 올 때',
    peek: '토스페이먼츠 결제 승인 후 서버로 알림이 안 들어오는 세 가지 경우를 다뤄요.',
    series: { pct: 37, label: '8편 중 3편 읽음' },
  },
];

export default function InsightCta() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:bg-gray-100">
      <div className="mx-auto grid w-full max-w-15000 gap-300 px-250 pt-300 pb-1250 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-400 lg:px-500 lg:pt-500 lg:pb-500">
        {/* 본문 */}
        <main className="min-w-0">
          <p className="font-designer-12b font-black tracking-[0.02em] text-rose-600">
            인사이트 · 바이브코딩 막힘 사전
          </p>
          <div className="mt-75 flex items-center gap-100 font-designer-12m font-semibold text-gray-400">
            <span>웹앱 수익화</span>
            <span>·</span>
            <span>중급</span>
            <span>·</span>
            <span>7분 읽음</span>
          </div>
          <article className="relative mt-150 max-h-1400 overflow-hidden text-[15px] leading-[1.72] text-gray-700 after:absolute after:inset-x-0 after:bottom-0 after:h-800 after:bg-gradient-to-t after:from-white after:to-transparent after:content-[''] lg:max-h-none lg:after:hidden">
            <p>
              …결국 문제는 코드가 아니었어요.{' '}
              <b className="text-gray-900">
                모바일 앱과 웹은 카카오가 돌려보내는 주소가 서로 다른데
              </b>
              , 에이전트는 그걸 모르고 하나만 등록했던 거죠. 콘솔에서 플랫폼별
              redirect URI를 각각 등록하고, 코드에서는 실행 환경에 맞는 주소를
              골라 쓰면 끝이에요. 여기까지 왔다면 남들이 두 시간 태우는 벽을
              방금 넘은 겁니다.
            </p>
          </article>
          <div className="mt-100 mb-300 flex w-fit items-center gap-75 rounded-full bg-green-50 px-150 py-75 font-designer-12b font-extrabold text-green-700">
            <Check className="size-150" aria-hidden /> 이 글 다 읽었어요
          </div>

          {/* 세그먼트형 사회적 증거 (관심축) */}
          <div className="mt-300 mb-150 flex items-center gap-125">
            <Faces names={['민', '현', '지']} extra="+9" />
            <p className="font-designer-12b leading-[1.4] font-bold text-gray-600">
              <b className="text-gray-900">웹앱 수익화가 목표인 12명</b>이 오늘
              이 다음 글들을 열었어요.
            </p>
          </div>

          {/* 다음 글 3갈래 (plain link — 잠금 없음) */}
          <p className="mt-100 mb-125 font-designer-12b font-black tracking-[0.06em] text-gray-400 uppercase">
            다음 한 칸 · 3갈래
          </p>
          <div className="grid gap-125">
            {BRANCHES.map((branch) => (
              <Link
                key={branch.title}
                href="/insights"
                className={cnBranch(branch.reco)}
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-75 flex items-center gap-75">
                    <span className={badgeCls(branch.tone)}>{branch.tag}</span>
                    {branch.reco && (
                      <span className="inline-flex items-center gap-25 font-designer-12b font-black text-rose-600">
                        ↗ 이어서 추천
                      </span>
                    )}
                  </span>
                  <span className="block text-[14px] leading-[1.34] font-extrabold tracking-[-0.01em] text-gray-900">
                    {branch.title}
                  </span>
                  <span className="mt-50 block truncate font-designer-12m font-semibold text-gray-500">
                    {branch.peek}
                  </span>
                  {branch.series && (
                    <span className="mt-100 flex items-center gap-75">
                      <svg
                        viewBox="0 0 100 4"
                        preserveAspectRatio="none"
                        className="h-50 flex-1 overflow-hidden rounded-full bg-gray-100"
                        aria-hidden="true"
                      >
                        <rect
                          width={branch.series.pct}
                          height="4"
                          rx="2"
                          className="fill-gray-700"
                        />
                      </svg>
                      <span className="font-designer-12b font-extrabold whitespace-nowrap text-gray-500">
                        {branch.series.label}
                      </span>
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="size-200 flex-none self-center text-gray-300"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </main>

        {/* 우측 레일 (보조): 방 문 · 구독 · CTA */}
        <aside className="min-w-0 space-y-200 lg:sticky lg:top-500 lg:self-start">
          <Link
            href="/cohorts/1"
            className="flex items-center gap-125 rounded-200 border border-blue-600/20 bg-blue-50 p-175 transition-shadow hover:shadow-2"
          >
            <span className="grid size-450 flex-none place-items-center rounded-150 bg-white shadow-1">
              <MessageCircle className="size-225 text-blue-600" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block font-designer-13b font-black text-gray-900">
                웹앱 수익화 방
              </b>
              <span className="mt-25 block font-designer-12b font-bold text-blue-700">
                같은 목표 24명 · 막힌 질문은 여기서 풀어요
              </span>
            </span>
            <ChevronRight
              className="size-225 flex-none text-blue-600"
              aria-hidden
            />
          </Link>

          <p className="font-designer-12m leading-[1.5] font-semibold text-gray-400">
            표기 수치·인원은 예시 데이터예요. build에서는 관심분야 방의 실집계만
            쓰고, 다음 글은 잠금 없이 바로 읽을 수 있어요.
          </p>

          <div className="rounded-200 border border-gray-200 bg-gray-50 p-175">
            <div className="flex items-center gap-100">
              <Mail className="size-200 text-gray-600" aria-hidden />
              <h3 className="font-designer-13b font-black text-gray-900">
                가입 없이, 글만 받고 싶다면
              </h3>
            </div>
            <p className="mt-75 font-designer-12m leading-[1.45] font-semibold text-gray-500">
              웹앱 수익화 글만 이메일로 받아보세요. 관심분야는 구독 폼에서 함께
              고릅니다.
            </p>
            <div className="mt-125 flex h-525 items-center justify-between rounded-150 border border-gray-200 bg-white pr-75 pl-150 font-designer-12b font-bold text-gray-400">
              <span>이메일 주소 입력</span>
              <span className="grid h-375 place-items-center rounded-100 bg-gray-900 px-150 font-designer-12b font-extrabold text-white">
                글만 받기
              </span>
            </div>
          </div>

          <div className="space-y-100 pt-100 lg:pt-0">
            <Link
              href="/insights"
              className="flex h-650 w-full items-center justify-center gap-100 rounded-150 bg-rose-500 text-[15.5px] font-black text-white transition-colors hover:bg-rose-600"
            >
              이어서 추천 글 열기{' '}
              <ArrowRight className="size-225" aria-hidden />
            </Link>
            <Button
              type="button"
              color="outlined"
              size="large"
              icon={<Bookmark className="size-175" aria-hidden />}
              className="h-550 w-full rounded-150 border-gray-300 text-[13.5px] font-extrabold text-gray-700 hover:bg-gray-50"
            >
              이 글 저장하기
            </Button>
            <p className="text-center font-designer-12m leading-[1.5] font-semibold text-gray-400">
              잠금 없이 바로 읽기 · 예시 데이터 표기 · 언제든 수신거부
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function cnBranch(reco?: boolean) {
  return cn(
    'flex gap-125 rounded-200 border bg-white p-150 transition-shadow',
    reco
      ? 'border-rose-500 shadow-1 ring-4 ring-rose-50 hover:shadow-2'
      : 'border-gray-200 hover:border-gray-300',
  );
}

function badgeCls(tone: BranchTone) {
  return cn(
    'rounded-full px-125 py-30 font-designer-12b font-black whitespace-nowrap',
    BRANCH_TAG[tone],
  );
}
