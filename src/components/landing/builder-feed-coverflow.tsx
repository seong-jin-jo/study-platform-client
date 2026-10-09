'use client';

import {
  ChevronLeft,
  ChevronRight,
  Forward,
  Heart,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import IconButton from '@/components/common/ui/icon-button';

/* ─── Mock feed (landing marketing — static, no backend) ─── */

interface Feed {
  name: string;
  lines: string[];
  likes: number;
  comments: number;
}

const FEED: Feed[] = [
  {
    name: '뭉다',
    lines: [
      '오늘 처음 만들어본 웹사이트!',
      '뭘 먼저 시작해야될지 모르겠어서 고민이 많았던...',
      '바이브 코딩인데 하나씩 따라가보니 그냥 배포됨 ㅋㅋ',
    ],
    likes: 24,
    comments: 10,
  },
  {
    name: '성윤',
    lines: [
      '사이드 프로젝트 랜딩 완성했어요',
      '디자인만 하던 제가 직접 배포까지 하다니',
      'URL 생기니까 진짜 실감나네요 🚀',
    ],
    likes: 38,
    comments: 12,
  },
  {
    name: '지우',
    lines: [
      '감성 카페 큐레이션 사이트 오픈!',
      '코딩 1도 몰랐는데 20일 만에 이게 되네요',
      '에러 날 때마다 질문하니까 막힘이 없었어요',
    ],
    likes: 51,
    comments: 18,
  },
  {
    name: '도현',
    lines: [
      '팀 프로필 모음 사이트 배포 완료',
      '기획만 하다가 직접 만들어보니 시야가 넓어졌어요',
      '빌더 피드 구경하면서 영감도 많이 받았습니다',
    ],
    likes: 29,
    comments: 7,
  },
  {
    name: '하늘',
    lines: [
      '내 포트폴리오 사이트, 드디어 세상에!',
      '강의만 100개 보던 제가 결과물을 냈어요',
      '러닝메이트 피드백 덕분에 퀄리티가 확 올라감',
    ],
    likes: 44,
    comments: 15,
  },
];

/* ─── Single builder-feed card (Figma 1502:18192, 368×538) ───
   Internal layout uses % positions so the card stays faithful while
   scaling down with the viewport (same pattern as hero-flip-card). */

function BuilderFeedCard({ feed }: { feed: Feed }) {
  return (
    <div className="relative aspect-[368/538] w-full overflow-hidden rounded-150 bg-white shadow-[0px_4px_24px_0px_rgba(0,0,0,0.25)]">
      {/* Image block (gradation/600) */}
      <div
        className="absolute inset-x-0 bg-gray-600"
        style={{ top: '26.21%', height: '60.04%' }}
      />

      {/* Profile */}
      <div
        className="absolute flex items-center gap-125"
        style={{ left: '5.43%', top: '3.72%' }}
      >
        <Image
          src="/landing/feed-avatar.svg"
          alt=""
          width={24}
          height={24}
          className="size-300 shrink-0 rounded-full"
        />
        <p className="whitespace-nowrap text-[14px] font-medium leading-[1.5] tracking-[-0.266px] text-gray-800">
          {feed.name}
        </p>
      </div>

      {/* Body */}
      <div
        className="absolute text-[16px] leading-[1.5] tracking-[-0.304px] text-gray-800"
        style={{ left: '5.43%', right: '5.43%', top: '9.67%' }}
      >
        {feed.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* Indicator dots */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-30"
        style={{ top: '88.85%' }}
      >
        <span className="h-75 w-225 rounded-full bg-gray-800" />
        <span className="size-75 rounded-full bg-gray-300" />
        <span className="size-75 rounded-full bg-gray-300" />
        <span className="size-75 rounded-full bg-gray-300" />
      </div>

      {/* Like / comment / share */}
      <div
        className="absolute flex items-center gap-125"
        style={{ left: '5.43%', top: '91.82%' }}
      >
        <div className="flex items-center gap-30">
          <Heart className="size-250 text-gray-1000" />
          <span className="text-[16px] leading-[1.5] tracking-[-0.304px] text-gray-1000">
            {feed.likes}
          </span>
        </div>
        <div className="flex items-center gap-50">
          <MessageSquare className="size-250 text-gray-1000" />
          <span className="text-[16px] leading-[1.5] tracking-[-0.304px] text-gray-1000">
            {feed.comments}
          </span>
        </div>
        <Forward className="size-250 text-gray-1000" />
      </div>
    </div>
  );
}

/* ─── Cover-flow carousel ─────────────────────────────────
   5 slots: center (z-30, sharp), inner ±1 (scale .9375, blur 2px),
   outer ±2 (scale .807, blur 5px). Offsets are % of the center
   card width (368px) so they hold across viewport sizes. */

const SLOTS = [
  {
    pos: -2,
    z: 'z-10',
    cls: 'hidden lg:block',
    tx: -108.56,
    scale: 0.8071,
    blur: 'blur-[5px]',
  },
  {
    pos: -1,
    z: 'z-20',
    cls: 'hidden lg:block',
    tx: -58.97,
    scale: 0.9375,
    blur: 'blur-[2px]',
  },
  { pos: 0, z: 'z-30', cls: 'block', tx: 0, scale: 1, blur: '' },
  {
    pos: 1,
    z: 'z-20',
    cls: 'hidden lg:block',
    tx: 58.97,
    scale: 0.9375,
    blur: 'blur-[2px]',
  },
  {
    pos: 2,
    z: 'z-10',
    cls: 'hidden lg:block',
    tx: 108.56,
    scale: 0.8071,
    blur: 'blur-[5px]',
  },
];

export function BuilderFeedCoverflow({ className }: { className?: string }) {
  const [center, setCenter] = useState(0);
  const n = FEED.length;

  const move = (dir: 1 | -1) => setCenter((c) => (c + dir + n) % n);

  return (
    <div className={cn('relative mx-auto w-full max-w-17500', className)}>
      {/* Height spacer = center card */}
      <div className="mx-auto aspect-[368/538] w-full max-w-4600" aria-hidden />

      {/* Cards */}
      {SLOTS.map((slot) => {
        const feed = FEED[(center + slot.pos + n) % n];
        return (
          <div
            key={slot.pos}
            className={cn(
              'absolute left-1/2 top-1/2 w-full max-w-4600',
              slot.z,
              slot.cls,
              slot.blur,
            )}
            style={{
              transform: `translate(-50%, -50%) translateX(${slot.tx}%) scale(${slot.scale})`,
            }}
            aria-hidden={slot.pos !== 0}
          >
            <BuilderFeedCard feed={feed} />
          </div>
        );
      })}

      {/* Chevrons */}
      <IconButton
        onClick={() => move(-1)}
        tone="ghost"
        size="lg"
        label="이전 결과물"
        className="absolute left-0 top-1/2 z-40 size-625 -translate-y-1/2 rounded-none text-gray-800 transition-opacity hover:bg-transparent hover:opacity-70"
      >
        <ChevronLeft className="size-625" strokeWidth={1.5} />
      </IconButton>
      <IconButton
        onClick={() => move(1)}
        tone="ghost"
        size="lg"
        label="다음 결과물"
        className="absolute right-0 top-1/2 z-40 size-625 -translate-y-1/2 rounded-none text-gray-800 transition-opacity hover:bg-transparent hover:opacity-70"
      >
        <ChevronRight className="size-625" strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}
