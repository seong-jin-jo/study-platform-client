'use client';

import { domAnimation, LazyMotion, m, useInView } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, useRef, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import { Disclosure } from '@/components/common/ui/disclosure';
import { BenefitCarousel } from './benefit-carousel';
import { BuilderFeedCoverflow } from './builder-feed-coverflow';
import { HeroFlipCard } from './hero-flip-card';
import { StudyReadyForm } from './study-ready-form';

/* ─── Animation helper ──────────────────────────────── */

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <m.div
      ref={ref}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/* ─── Layout constant ───────────────────────────────── */

const SECTION_INNER = 'mx-auto w-full max-w-17500 px-250 md:px-500 lg:px-1000';

/* ─── Data ──────────────────────────────────────────── */

const HERO_TAGS = [
  '약 20시간',
  '1시간 집중 전자책',
  '상호 간의 피드백',
  '무제한 질문답변',
];

interface CheckCardLine {
  text: string;
  red: boolean;
}

const CHECK_CARDS: { tag: string; lines: CheckCardLine[] }[] = [
  {
    tag: '#피그마_감옥',
    lines: [
      { text: 'FIgma 파일까진 완벽한데...', red: false },
      { text: '거기서 끝이에요.', red: false },
      { text: '살아있는 웹사이트로 만들어내지 못하고', red: false },
      { text: '피그마 안에만 갇혀있어요.', red: true },
    ],
  },
  {
    tag: '#눈치_개발자',
    lines: [
      { text: '"이거 구현 가능해요?" 물어보는 게 매번', red: false },
      { text: '눈치보여요. 안된다고 하면', red: false },
      { text: '"아...네..."', red: true },
      { text: '할 수 밖에 없는 내가 싫어요.', red: false },
    ],
  },
  {
    tag: '#터미널_엔딩',
    lines: [
      { text: 'Claude로 뭔가 만들다가 오류 딱 하나가', red: false },
      { text: '해결이 안되요.', red: false },
      { text: '구글링도 해보고 별짓 다하다가', red: false },
      { text: '결국 터미널 닫고 유튜브 켜요.', red: true },
    ],
  },
  {
    tag: '#AI시대_막막',
    lines: [
      { text: 'AI 시대에 디자이너로서 뭘 해야할지', red: false },
      { text: '모르겠어요...', red: false },
      { text: '다들 뭔가 하는 것 같은데', red: true },
      { text: '나만 가만히 있는 느낌?', red: true },
    ],
  },
  {
    tag: '#유튜브_미아',
    lines: [
      { text: '바이브코딩 유튜브 이것저것', red: false },
      { text: '전진했는데, 정작 뭐부터 해야 하는지', red: false },
      { text: '감이 안잡혀요.', red: false },
      { text: '영상은 많은데 방향이 없어요.', red: true },
    ],
  },
  {
    tag: '#노션_무덤',
    lines: [
      { text: '사이드 프로젝트 아이디어는', red: false },
      { text: '넘쳐나는데 항상 노션에만 쌓여요.', red: false },
      { text: '실행이 안 되니까 아이디어가', red: true },
      { text: '무덤이 되어가요', red: true },
    ],
  },
];

const CURRICULUM_ITEMS = [
  {
    num: '01',
    title: '영상, 강의보다 매일 1시간씩 읽는 전자책',
    subtitle: '하루 1시간, 탄탄하게 다지는 기본기',
    body: '수십 시간짜리 VOD를 틀어놓고 멍때리지 마세요.\n바이브 코딩은 핵심 개념만 짚어주는\n텍스트 기반의 학습지 형태로 진행됩니다.\n배운 원리를 그 자리에서 즉시 코드로 타이핑하며 진짜 내 실력으로\n체화하는 성취감을 느껴보세요.',
  },
  {
    num: '02',
    title: '에러 창 앞에서의 좌절은 끝, 무제한 질문답변',
    subtitle: '언제든 기댈 수 있는 든든한 페이스메이커',
    body: '알 수 없는 영문 에러 메시지 앞에서 며칠씩 진도를\n멈춰본 적 있으신가요?\n이제 코딩 중 막히는 부분이 생기면 언제든 질문하세요.\nAI(Claude)와 운영진이 즉각적인 가이드를 제공하여 포기 없이\n다음 단계로 넘어갈 수 있도록 밀착 지원합니다.',
  },
  {
    num: '03',
    title: '영감이 끊이지 않는 공간, 빌더 피드 탐색',
    subtitle: '동료들과 함께 만드는 강력한 시너지',
    body: '다른 수강생들은 이 코드를 어떻게 응용하고 있을까요?\n무제한으로 열람 가능한 빌더 피드에서 다채로운\n프로젝트 레퍼런스를 구경해 보세요.\n서로를 팔로우하고 소통하며, 내 프로덕트의 퀄리티를\n한 단계 높일 새로운 인사이트를 얻을 수 있습니다.',
  },
  {
    num: '04',
    title: '마침내 세상에 선보이는 내 웹사이트, 배포와 피드백',
    subtitle: '고유한 URL로 찍는 성장의 마침표',
    body: '완성한 작업물을 제출하고 러닝메이트들과 건설적인 피드백을\n주고받으며 디테일을 다듬어 보세요.\n모든 과정을 거쳐 완성된 나만의 웹사이트를 라이브 환경에 배포하고,\n고유한 링크를 획득하는 짜릿한 경험을 선사합니다.',
  },
];

const FAQ_ITEMS = [
  {
    q: '코딩 한 번도 안 해봤는데 따라갈 수 있나요?',
    a: '네, 완전 비전공자도 따라올 수 있도록 설계되어 있습니다. Claude와 AI 도구를 활용해 코드를 직접 작성하지 않아도 웹사이트를 만들 수 있습니다.',
  },
  {
    q: '어떤 준비물이 필요한가요?',
    a: 'PC 또는 맥북과 인터넷 환경만 있으면 됩니다. Claude Pro 구독($20/월)이 필요하며, 기타 설치 프로그램은 안내에 따라 진행됩니다.',
  },
  {
    q: '하루에 얼마나 시간을 써야 하나요?',
    a: '하루 1~2시간을 권장합니다. 총 20일 과정이며, 레슨별로 무리 없이 따라올 수 있는 분량으로 설계되어 있습니다.',
  },
  {
    q: 'Claude Pro를 이미 구독 중이에요!',
    a: '별도 추가 비용 없이 기존 구독을 그대로 활용하실 수 있습니다. 코스 수강료와 Claude Pro 구독은 별개입니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: '수강 시작 후 3일 이내에는 전액 환불이 가능합니다. 이후에는 환불이 어렵습니다. 자세한 내용은 이용약관을 참고해 주세요.',
  },
];

/* ─── Speech bubbles (one per Check card, desktop only) ──
   Each bubble is hover-gated to its own card (group-hover) and placed
   relative to that card per Figma 853:32539. The transform is applied
   to the bubble SHAPE only — the tail orientation is baked there — while
   the text stays upright (Figma keeps the text node un-transformed). */

const SPEECH_BUBBLES = [
  {
    src: '/landing/speech-bubble-1.svg',
    transform: 'none',
    left: '-19.6%',
    top: '-22.9%',
    width: 207,
    height: 168,
    text: ['디자인은 완성인데', '그 다음이 없다'],
  },
  {
    src: '/landing/speech-bubble-2.svg',
    transform: 'rotate(-5.97deg)',
    left: '49.9%',
    top: '-20.8%',
    width: 183,
    height: 145,
    text: ['개발자 앞에서', '항상 을이 되는 느낌'],
  },
  {
    src: '/landing/speech-bubble-3.svg',
    transform: 'scaleX(-1)',
    left: '58.2%',
    top: '-26.7%',
    width: 207,
    height: 168,
    text: ['오류 하나에', '모든 의지가 증발'],
  },
  {
    src: '/landing/speech-bubble-4.svg',
    transform: 'rotate(22.8deg)',
    left: '-39.3%',
    top: '27.2%',
    width: 207,
    height: 168,
    text: ['뭔가 해야 하는건 아는데', '뭘 해야 할지...'],
  },
  {
    src: '/landing/speech-bubble-5.svg',
    transform: 'none',
    left: '-16.4%',
    top: '-26%',
    width: 207,
    height: 168,
    text: ['강의는 100개', '봤는데 결과물은 0개'],
  },
  {
    src: '/landing/speech-bubble-6.svg',
    transform: 'scaleX(-1)',
    left: '72.3%',
    top: '-14.1%',
    width: 207,
    height: 168,
    text: ['아이디어만 쌓이고', '실행력은 0'],
  },
];

/* ─── Main ──────────────────────────────────────────── */

export default function LandingContent() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative w-full pb-3000">
        <HeroSection />
        <CheckSection />
        <ResultsSection />
        <CurriculumSection />
        <BenefitsSection />
        <FAQSection />
        <FloatingCTABar />
      </div>
    </LazyMotion>
  );
}

/* ─── 1. Hero Section ───────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gray-100 pb-1000 pt-1000 md:pb-1250 md:pt-1625">
      <div className={cn(SECTION_INNER, 'flex flex-col items-center')}>
        {/* Headline */}
        <FadeIn className="text-center">
          <h1 className="text-[32px] font-bold leading-[1.5] tracking-[-0.76px] text-gray-800 md:text-[50px]">
            <span className="text-rose-500">바이브 코딩</span>
            <br />
            뭐부터 해야 할지 모르겠죠?
            <br />
            그래서 준비했습니다.
          </h1>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn
          delay={0.2}
          className="mt-300 text-center text-[15px] leading-[1.5] text-gray-800 md:text-[26px]"
        >
          코딩의 높은 진입장벽 앞에서 더 이상 망설이지 마세요.
          <br />
          저희가 제시하는 길을 따라오면, 20일 후 여러분의 첫 웹사이트가 세상에
          배포됩니다.
        </FadeIn>

        {/* Tag row */}
        <FadeIn
          delay={0.3}
          className="mt-300 flex flex-wrap items-center justify-center gap-100"
        >
          {HERO_TAGS.map((tag) => (
            <span
              key={tag}
              className="whitespace-nowrap rounded-100 bg-gray-800 px-125 py-50 font-designer-13r leading-[1.5] tracking-[-0.304px] text-white md:text-[16px]"
            >
              {tag}
            </span>
          ))}
        </FadeIn>

        {/* Hero 3D flip carousel */}
        <FadeIn delay={0.4} className="mt-1000 w-full">
          <HeroFlipCard />
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── 2. Check Section ──────────────────────────────── */

function CheckCard({
  card,
  img,
  bubble,
}: {
  card: (typeof CHECK_CARDS)[0];
  img: string;
  bubble: (typeof SPEECH_BUBBLES)[0];
}) {
  return (
    <div className="group relative aspect-[336/404] w-full">
      {/* Speech bubble — desktop only, revealed on this card's hover */}
      <div
        className="pointer-events-none absolute z-20 hidden w-max opacity-0 transition-opacity duration-200 group-hover:opacity-100 xl:block"
        style={{ left: bubble.left, top: bubble.top }}
      >
        <div className="relative">
          <Image
            src={bubble.src}
            alt=""
            width={bubble.width}
            height={bubble.height}
            unoptimized
            style={{ transform: bubble.transform }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[16px] font-semibold leading-[1.5] text-gray-800">
            {bubble.text.map((t) => (
              <p key={`${bubble.src}-${t}`}>{t}</p>
            ))}
          </div>
        </div>
      </div>
      {/* Rose shadow — appears on hover */}
      <div className="absolute inset-0 translate-x-50 translate-y-50 rounded-200 bg-rose-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {/* Card */}
      <div className="absolute inset-0 overflow-hidden rounded-200 border border-transparent bg-gray-100 transition-colors duration-200 group-hover:border-gray-300 group-hover:bg-white">
        {/* Tag + description */}
        <div className="flex flex-col items-center gap-250 px-200 pt-400">
          <p className="text-center text-[20px] font-bold leading-[1.5] text-black">
            {card.tag}
          </p>
          <div className="text-center text-[16px] leading-[1.5] text-gray-800">
            {card.lines.map((line) => (
              <p
                key={`${card.tag}-${line.text}`}
                className={cn(line.red && 'font-bold text-rose-500')}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>

        {/* Illustration */}
        <div className="absolute inset-x-0 bottom-0 h-1/2">
          <Image
            src={img}
            alt=""
            fill
            className="object-contain object-bottom"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 336px"
          />
        </div>
      </div>
    </div>
  );
}

function CheckSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white pb-1000 pt-1000 md:pb-1250 md:pt-1625">
      <div className={cn(SECTION_INNER, 'relative z-10')}>
        {/* Badge */}
        <FadeIn className="flex flex-col items-center gap-75 text-center">
          <span className="rounded-500 bg-rose-300 px-250 py-125 text-[20px] font-medium leading-[1.5] text-white md:text-[24px]">
            Check It!
          </span>
          <h2 className="text-[24px] font-bold leading-[36px] text-text-strong md:font-designer-32b lg:font-designer-36b">
            혹시 이런 적 없으셨나요?
          </h2>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn delay={0.15} className="mt-75 text-center">
          <p className="text-[14px] leading-[1.5] text-gray-800 md:text-[16px]">
            카드 위 마우스를 올려보세요
          </p>
        </FadeIn>

        {/* Cards grid */}
        <FadeIn delay={0.2} className="mt-500">
          <div className="grid grid-cols-1 gap-500 sm:grid-cols-2 lg:grid-cols-3">
            {CHECK_CARDS.map((card, i) => (
              <CheckCard
                key={card.tag}
                card={card}
                img={`/landing/check-${i + 1}.png`}
                bubble={SPEECH_BUBBLES[i]}
              />
            ))}
          </div>
        </FadeIn>

        {/* CTA highlight box (Figma 959:13485 — gray box, gray border, no icon) */}
        <FadeIn delay={0.3} className="mt-1000 flex justify-center">
          <div className="flex w-fit max-w-full items-center justify-center rounded-200 border border-gray-500 bg-gray-100 px-750 py-375">
            <p className="text-center text-[18px] font-bold leading-[1.5] tracking-[-0.532px] text-gray-800 md:text-[24px] lg:text-[28px]">
              3개 이상 해당된다면, 이 코스는 여러분을 위해 설계됐습니다.
            </p>
          </div>
        </FadeIn>

        {/* Survey — study-ready form (Figma 1782:10310) */}
        <FadeIn delay={0.3} className="mt-1000">
          <div className="flex flex-col items-center gap-75 text-center">
            <h2 className="text-[24px] font-bold leading-[1.5] text-text-strong md:font-designer-32b lg:font-designer-36b">
              여러분의 목소리로 다음 코스가 완성됩니다.
            </h2>
            <p className="text-[14px] leading-[1.5] text-gray-800 md:text-[16px]">
              바이브 코딩 입문 이후, 어떤 프로덕트를 만들고 싶으신가요? 제로원에
              의견을 남겨주시면 코스 오픈 시 가장 먼저 알려드릴게요.
            </p>
          </div>
          <div className="mx-auto mt-500 w-full max-w-10150">
            <StudyReadyForm />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── 3. Results Section ────────────────────────────── */

function ResultsSection() {
  return (
    <section className="w-full overflow-hidden bg-gray-100 pb-1000 pt-1000 md:pb-1250 md:pt-1625">
      <div className={SECTION_INNER}>
        {/* Badge */}
        <FadeIn className="flex flex-col items-center gap-75 text-center">
          <span className="rounded-500 bg-rose-300 px-250 py-125 text-[20px] font-medium leading-[1.5] text-white md:text-[24px]">
            베타 수강생 결과물
          </span>
          <h2 className="text-[24px] font-bold leading-[36px] text-text-strong md:font-designer-32b lg:font-designer-36b">
            개발 경험 Zero, 20일 만에 웹사이트 배포
          </h2>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn delay={0.15} className="mt-75 text-center">
          <p className="text-[14px] leading-[1.5] text-gray-800 md:text-[20px]">
            모두 개발 경험이 전무했습니다. 20일 후, 전부 각자의 URL을 가지게
            되었어요.
          </p>
        </FadeIn>
      </div>

      {/* Builder-feed cover-flow carousel (Figma 136:7025) */}
      <FadeIn delay={0.2} className="mt-500">
        <BuilderFeedCoverflow className="px-250 md:px-500 lg:px-1000" />
      </FadeIn>
    </section>
  );
}

/* ─── 4. Curriculum Section ─────────────────────────── */

function CurriculumRow({
  item,
  index,
}: {
  item: (typeof CURRICULUM_ITEMS)[0];
  index: number;
}) {
  return (
    <FadeIn delay={index * 0.1}>
      {/* Figma 959:13715 — badge(x260) · img box 682×467(x419) · text(x1231,w393).
          Content zone 260..1660 = 1400 = max-w-17500 → fr cols mirror Figma px. */}
      <div className="relative border-t border-gray-800 pt-500 md:pt-750 lg:grid lg:grid-cols-[auto_109fr_682fr_130fr_393fr] lg:items-start lg:pt-1250">
        {/* Number badge */}
        <div className="mb-500 inline-flex items-center justify-center rounded-100 border border-gray-800 px-175 py-50 lg:col-start-1 lg:mb-0">
          <span className="text-[16px] font-medium leading-[1.5] text-gray-800 md:text-[20px]">
            {item.num}
          </span>
        </div>

        {/* Image placeholder (Figma #d9d9d9, ratio 682/467) */}
        <div className="mb-500 flex aspect-[682/467] w-full items-center justify-center rounded-200 bg-gray-300 lg:col-start-3 lg:mb-0">
          <p className="text-[20px] font-semibold leading-[1.5] tracking-[-0.494px] text-black md:text-[26px]">
            움직이는 인터랙션
          </p>
        </div>

        {/* Text side */}
        <div className="flex flex-col gap-350 lg:col-start-5 lg:mt-1500">
          <div className="flex flex-col gap-50">
            <h3 className="text-[20px] font-semibold leading-[1.5] tracking-[-0.494px] text-black md:text-[26px]">
              {item.title}
            </h3>
            <p className="text-[18px] font-semibold leading-[1.5] tracking-[-0.456px] text-gray-400 md:text-[24px]">
              {item.subtitle}
            </p>
          </div>
          <p className="whitespace-pre-line text-[14px] font-semibold leading-[1.5] tracking-[-0.304px] text-gray-800 md:text-[16px]">
            {item.body}
          </p>
        </div>
      </div>
    </FadeIn>
  );
}

function CurriculumSection() {
  return (
    <section className="w-full bg-white pb-1000 pt-1000 md:pb-1250 md:pt-1625">
      <div className={SECTION_INNER}>
        {/* Title */}
        <FadeIn className="text-center">
          <h2 className="text-[24px] font-bold leading-[1.5] tracking-[-0.57px] text-gray-800 md:text-[30px]">
            혼자서 헤매는 시간은 끝, 20일 완성 바이브 로드맵
          </h2>
        </FadeIn>

        {/* Description */}
        <FadeIn delay={0.1} className="mt-75 text-center">
          <p className="text-[14px] leading-[1.5] tracking-[-0.38px] text-gray-800 md:text-[20px]">
            눈으로만 보는 지루한 강의가 아닙니다. 핵심 개념을 배우고, 막히면
            묻고, 동료들과 교류하며 나만의 웹사이트를 배포하는 4단계 실전 여정을
            미리 확인해 보세요.
          </p>
        </FadeIn>

        {/* Rows */}
        <div className="mt-1000 flex flex-col gap-1250">
          {CURRICULUM_ITEMS.map((item, i) => (
            <CurriculumRow key={item.num} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 5. Benefits Section ───────────────────────────── */

function BenefitsSection() {
  // No overflow-hidden here: it would turn the section into the sticky
  // containing scrollport and break the carousel's pinned viewport.
  return (
    <section className="relative w-full bg-linear-to-l from-gradation-600 to-gray-800 to-[53.846%]">
      <BenefitCarousel className={cn(SECTION_INNER, 'relative z-10')} />
    </section>
  );
}

/* ─── 6. FAQ Section ────────────────────────────────── */

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full bg-gray-100 pb-1000 pt-1000 md:pb-1250 md:pt-1625">
      <div className={SECTION_INNER}>
        {/* Title */}
        <FadeIn className="text-center">
          <h2 className="text-[24px] font-bold leading-[1.5] tracking-[-0.76px] text-gray-800 md:text-[40px]">
            자주하는 질문 답변
          </h2>
        </FadeIn>

        {/* Accordion */}
        <FadeIn delay={0.1} className="mx-auto mt-1000 max-w-10250">
          <Disclosure.Group
            className="gap-125"
            type="single"
            value={openIndex === null ? [] : [String(openIndex)]}
            onValueChange={(value) =>
              setOpenIndex(value.length === 0 ? null : Number(value[0]))
            }
          >
            {FAQ_ITEMS.map((item, i) => (
              <Disclosure.Item
                key={item.q}
                value={String(i)}
                className="overflow-hidden rounded-200 border border-gray-300 bg-white"
              >
                <Disclosure.Header className="gap-125 px-375 py-250">
                  <span className="shrink-0 text-[14px] font-medium leading-[1.5] text-rose-500 md:text-[16px]">
                    Q
                  </span>
                  <span className="flex-1 text-left text-[14px] font-medium leading-[1.5] text-gray-800 md:text-[16px]">
                    {item.q}
                  </span>
                </Disclosure.Header>
                <Disclosure.Panel className="border-gray-300 px-375 py-300">
                  <p className="text-[14px] leading-[1.5] text-gray-800 md:text-[16px]">
                    {item.a}
                  </p>
                </Disclosure.Panel>
              </Disclosure.Item>
            ))}
          </Disclosure.Group>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── 7. Floating CTA Bar ───────────────────────────── */

function FloatingCTABar() {
  // Lens normal map (R = horizontal, G = vertical displacement).
  // 128 = neutral (no shift); only the edges deviate → barrel refraction,
  // strongest at the pill edges like real glass. Built as a data-URI so no asset.
  const lensMap =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gx" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgb(255,0,0)"/>
            <stop offset="0.28" stop-color="rgb(128,0,0)"/>
            <stop offset="0.72" stop-color="rgb(128,0,0)"/>
            <stop offset="1" stop-color="rgb(0,0,0)"/>
          </linearGradient>
          <linearGradient id="gy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgb(0,255,0)"/>
            <stop offset="0.28" stop-color="rgb(0,128,0)"/>
            <stop offset="0.72" stop-color="rgb(0,128,0)"/>
            <stop offset="1" stop-color="rgb(0,0,0)"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="black"/>
        <rect width="100" height="100" fill="url(#gx)" style="mix-blend-mode:screen"/>
        <rect width="100" height="100" fill="url(#gy)" style="mix-blend-mode:screen"/>
      </svg>`,
    );

  return (
    <div
      className="liquid-glass mobile-tabbar-safe-bottom-sm fixed bottom-0 left-0 z-40 w-full overflow-hidden rounded-none bg-gray-0 px-500 pt-300 sm:bottom-1250 sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:max-w-9250 sm:rounded-2000 sm:bg-gray-0/60 sm:px-700 sm:shadow-3 sm:ring-1 sm:ring-inset sm:ring-gray-0/50"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      {/* Liquid-glass refraction filter — warps the live backdrop behind the bar.
          Figma Glass → CSS/SVG mapping:
            Frost 55      → blur(6px) (applied via .liquid-glass in global.css)
            Refraction 80 → lens displacement scale ~50
            Dispersion 50 → R/B sampled at scale 56/44 then recombined (chromatic)
            Splay 25      → fractalNoise ripple scale 6
            Light -45°    → directional highlight overlay (below)
          Not expressible in CSS/SVG: Depth (approximated by shadow-3) and the
          GPU lens specular — these are the documented residual gaps. */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <title>Liquid glass filter definitions</title>
        <filter
          id="liquid-glass"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={lensMap}
            preserveAspectRatio="none"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="lensRaw"
          />
          <feGaussianBlur in="lensRaw" stdDeviation={0.6} result="lens" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.016"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          {/* chromatic split: same backdrop refracted at 3 scales, one per channel */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="lens"
            scale={56}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispR"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="lens"
            scale={50}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispG"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="lens"
            scale={44}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispB"
          />
          <feColorMatrix
            in="dispR"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="rC"
          />
          <feColorMatrix
            in="dispG"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="gC"
          />
          <feColorMatrix
            in="dispB"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="bC"
          />
          <feBlend in="rC" in2="gC" mode="screen" result="rg" />
          <feBlend in="rg" in2="bC" mode="screen" result="rgb" />
          <feDisplacementMap
            in="rgb"
            in2="noise"
            scale={6}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      {/* Light -45° / 80% — directional specular highlight (top-left → bottom-right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.14) 100%)',
        }}
      />
      <div className="relative flex items-center justify-between gap-300">
        <p className="text-[14px] font-semibold leading-[1.5] tracking-[-0.456px] text-gray-800 md:text-[20px] lg:text-[24px]">
          얼리버드 혜택가로 바로 만나보세요!
        </p>
        <Link
          href="/class/vibe-intro-claude-code"
          className="shrink-0 rounded-100 bg-rose-500 px-200 py-100 font-designer-13m font-semibold leading-[1.5] tracking-[-0.38px] text-white transition-opacity hover:opacity-90 sm:w-3050 sm:p-100 sm:text-center sm:text-[20px]"
        >
          바로 시작하기
        </Link>
      </div>
    </div>
  );
}
