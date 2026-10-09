'use client';

import confetti from 'canvas-confetti';
import { Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import {
  useGetCourseCompletionRecap,
  useGetCourseDetail,
  useSubmitNextPlan,
} from '@/hooks/queries/course/course-queries';
import { useToastStore } from '@/stores/use-toast-store';
import { type ShareSurface, trackShare } from '@/utils/share-tracking';
import { FreeCompletionSurvey } from './_components/free-completion-survey';

async function copyLink(
  url: string,
  msg: string,
  showToast: (m: string) => void,
  surface: ShareSurface,
) {
  try {
    await navigator.clipboard.writeText(url);
    showToast(msg);
    trackShare(surface, 'clipboard');
  } catch {
    // clipboard unavailable
    trackShare(surface, 'failed');
  }
}

async function handleShareLink(showToast: (msg: string) => void) {
  await copyLink(
    window.location.origin,
    '링크가 복사되었어요!',
    showToast,
    'course_complete',
  );
}

async function handleShareInstagram(showToast: (msg: string) => void) {
  const url = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ url });
      trackShare('course_complete_instagram', 'system_share');
      return;
    } catch {
      // canceled
      trackShare('course_complete_instagram', 'canceled');
    }
  }
  await copyLink(
    url,
    '링크를 복사했어요. 인스타 스토리에 붙여넣어 자랑해보세요!',
    showToast,
    'course_complete_instagram',
  );
}

export default function CourseCompletePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const showToast = useToastStore((s) => s.showToast);

  const { data: course } = useGetCourseDetail(slug);
  const courseId = course?.courseId ?? 0;
  const { data: recap } = useGetCourseCompletionRecap(courseId);
  const completionType = recap?.completionType;
  const submitNextPlan = useSubmitNextPlan();

  useEffect(() => {
    if (completionType !== 'PAID') return;
    const end = Date.now() + 3000;
    const frame = async () => {
      await confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f63d68', '#fea3b4', '#fff1f3'],
      });
      await confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f63d68', '#fea3b4', '#fff1f3'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame().catch(() => {});
  }, [completionType]);

  // 피드백이 있으면 mutation 완료 후 네비게이션(언마운트로 인한 mutation 중단·토스트 유실 방지).
  function goWithFeedback(href: string) {
    if (!feedback.trim() || !courseId) {
      router.push(href);
      return;
    }
    submitNextPlan.mutate(
      { courseId, content: feedback },
      {
        onSuccess: () => showToast('제출이 완료되었어요!'),
        onSettled: () => router.push(href),
      },
    );
  }

  if (recap === undefined) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <p className="font-designer-16r text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (completionType === 'FREE') {
    return (
      <FreeCompletionSurvey courseId={courseId} recap={recap} slug={slug} />
    );
  }

  const stats = [
    { value: recap.latestCompletedLessonCount, label: '내가 들은 레슨 수' },
    { value: recap.studyDays, label: '일간의 여정' },
    { value: recap.siteUrlCount, label: '나만의 사이트 수' },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto flex max-w-page flex-col items-center px-600 py-800">
        {/* Party animation + title */}
        <div className="relative">
          <Image
            src="/class/vibe-intro/party-animation.png"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            unoptimized
            className="mx-auto"
          />
        </div>

        <h1 className="mt-400 text-center font-designer-28b text-gray-800">
          축하합니다. 드디어 해내셨어요!
        </h1>
        <p className="font-designer-28b text-gray-800">
          빌더님의 첫 사이트를 세상에 퍼뜨리세요 :)
        </p>

        <div className="mt-300 space-y-75 text-center font-designer-20r text-gray-800">
          <p>{recap.studyDays}일 만에 코스를 완주했어요.</p>
          <p>
            시작하기조차 막막했는데, 이제 만든 걸 보여줄 주소가 손에 있어요.
          </p>
          <p>또 만들고 싶은 게 벌써 떠오르지 않나요?</p>
        </div>

        {/* Stats */}
        <div className="mt-500 flex gap-200">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex h-1250 w-2125 flex-col items-center justify-center gap-25 rounded-200 border border-rose-300 bg-rose-50"
            >
              <p className="font-designer-24sb text-text-brand">{s.value}</p>
              <p className="font-designer-16m text-gray-1000">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Share CTAs */}
        <div className="mt-500 flex gap-200">
          <Button
            type="button"
            color="primary"
            size="large"
            onClick={() => handleShareLink(showToast)}
            className="h-625 w-3875 font-designer-18b"
          >
            <span className="flex items-center gap-50">
              <LinkIcon className="size-300" />
              링크 공유하기
            </span>
          </Button>
          <Button
            type="button"
            color="outlined"
            size="large"
            onClick={() => handleShareInstagram(showToast)}
            className="h-625 w-3875 border-border-brand font-designer-18b text-text-brand"
          >
            <span className="flex items-center gap-50">
              <Image
                src="/class/vibe-intro/instagram-icon.png"
                alt="Instagram"
                width={34}
                height={34}
              />
              인스타에 자랑하기
            </span>
          </Button>
        </div>

        {/* Message card */}
        <div className="mt-500 w-8288 rounded-br-750 rounded-tl-750 rounded-tr-750 border border-rose-300 p-400 text-center shadow-brand-card">
          <p className="font-designer-16sb text-gray-800">
            <span className="font-designer-16b text-text-brand">
              {recap.studyDays}
            </span>
            일 동안 고생 많으셨어요! :)
          </p>
          <p className="mt-150 font-designer-16r text-gray-800">
            한 가지 알려드릴께요. 두 번째 사이트는 처음 하셨을 때보다 훨씬
            빠르게 만드실 거에요!
          </p>
          <p className="mt-75 font-designer-16r text-gray-800">
            일주일 내로 머릿 속에 갖고 계신 아이디어 하나만 더 시도해보세요!
          </p>
          <p className="mt-75 font-designer-16r text-gray-800">
            사실 이제부터 진짜 출발선입니다 😁
          </p>
        </div>

        <hr className="mt-500 w-full border-border-subtle" />

        {/* Feedback section */}
        <h2 className="mt-500 font-designer-28b text-gray-800">
          다음에 만들어보고 싶은 게 있나요?
        </h2>
        <p className="mt-150 font-designer-20r text-gray-800">
          자유롭게 적어주세요. 다음 코스 만들 때 꼭 반영할게요 :)
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          aria-label="다음에 만들어보고 싶은 것"
          placeholder="포트폴리오 사이트, AI 챗봇, 쇼핑몰, 역량강화 등등 "
          className={cn(
            'mt-300 h-1625 w-10700 resize-none rounded-200 border border-border-default p-300 font-designer-16m text-gray-800 outline-none placeholder:text-gray-400',
            'focus:border-border-brand',
          )}
        />

        {/* Final CTAs */}
        <div className="mt-400 flex gap-200">
          <Button
            type="button"
            color="primary"
            size="large"
            onClick={() => goWithFeedback(`/class/${slug}/home?tab=feed`)}
            disabled={submitNextPlan.isPending}
            className="h-750 w-3875 font-designer-18b"
          >
            빌더들의 바이브 보기
          </Button>
          <Button
            type="button"
            color="outlined"
            size="large"
            onClick={() => goWithFeedback('/my-page')}
            disabled={submitNextPlan.isPending}
            className="h-750 w-3875 border-border-brand font-designer-18b text-text-brand"
          >
            내 빌더 피드 모아보기
          </Button>
        </div>

        <Link
          href="/class"
          className="mt-300 font-designer-16m text-text-brand"
        >
          건너뛰기
        </Link>
      </div>
    </div>
  );
}
