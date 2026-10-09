import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/common/ui/button';

const HERO_TITLE_LINES = ['혼자 막히지 않는', '바이브코딩'] as const;
const HERO_TITLE = HERO_TITLE_LINES.join(' ');
const HERO_SUBTITLE = '같은 곳에서 막힌 사람이 이미 답을 남겼어요.';
const LIVE_ROOM_COUNT = 4;
const LIVE_ROOM_COPY = `지금 ${LIVE_ROOM_COUNT}개 방에서 이야기가 오가는 중`;

/**
 * 홈 상단 히어로.
 *
 * app-release 승인 프레임에 맞춰 모바일은 세로 카드, 태블릿은 문구와 사진을
 * 나란히 둔 카드형 히어로를 사용한다. 1024px 이상은 기존 사진 배너와 문구를
 * 그대로 보존한다. 로그인 여부와 무관하게 모든 경로가 같은 운영 문구를 쓴다.
 */
export default function HomeHeroBanner() {
  return (
    <>
      <section
        data-testid="mobile-home-hero"
        className="px-200 pt-300 md:hidden"
      >
        <div className="border-border-brand bg-background-accent-rose-subtle overflow-hidden rounded-200 border">
          <div className="p-300">
            <p className="font-designer-12b text-text-brand tracking-wide">
              ZERO ONE IT DREAM
            </p>
            <h1 className="font-designer-28b text-text-strong mt-125 break-keep">
              {HERO_TITLE}
            </h1>
            <p className="font-designer-16r text-text-default mt-175 break-keep leading-relaxed">
              {HERO_SUBTITLE}
            </p>
            <p className="font-designer-12b text-text-subtle mt-125 flex items-center gap-75 break-keep max-lg:font-designer-16r">
              <span className="size-75 rounded-full bg-green-500" aria-hidden />
              {LIVE_ROOM_COPY}
            </p>
            <div className="mt-250 flex flex-col gap-100">
              <Button
                asChild
                color="primary"
                size="medium"
                className="w-full rounded-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-md:bg-background-accent-rose-strong max-md:text-text-inverse max-md:hover:bg-rose-700 max-md:active:bg-rose-700"
              >
                <Link data-testid="mobile-home-primary-cta" href="/insights">
                  인사이트 바다 탐색
                </Link>
              </Button>
              <Button
                asChild
                color="outlined"
                size="medium"
                className="w-full rounded-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                <Link href="/community">커뮤니티 살펴보기</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-2500">
            <Image
              src="/community/rooms/home-hero-v3.jpg"
              alt="늦은 밤 작업 중인 ZERO-ONE 멤버"
              fill
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section
        data-testid="tablet-home-hero"
        className="hidden px-300 md:block lg:hidden"
      >
        <div className="border-border-brand bg-background-accent-rose-subtle grid min-h-4500 grid-cols-2 overflow-hidden rounded-300 border">
          <div className="flex flex-col justify-center p-400">
            <p className="font-designer-12b text-text-brand tracking-wide">
              ZERO ONE IT DREAM
            </p>
            <h1 className="font-designer-34b text-text-strong mt-125 break-keep">
              {HERO_TITLE}
            </h1>
            <p className="font-designer-16r text-text-default mt-175 break-keep leading-relaxed">
              {HERO_SUBTITLE}
            </p>
            <p className="font-designer-12b text-text-subtle mt-125 flex items-center gap-75 break-keep max-lg:font-designer-16r">
              <span className="size-75 rounded-full bg-green-500" aria-hidden />
              {LIVE_ROOM_COPY}
            </p>
            <div className="mt-250 grid grid-cols-2 gap-100">
              <Button
                asChild
                color="primary"
                size="medium"
                className="rounded-150 bg-background-accent-rose-strong text-text-inverse hover:bg-rose-700 active:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                <Link href="/insights">인사이트 바다 탐색</Link>
              </Button>
              <Button
                asChild
                color="outlined"
                size="medium"
                className="rounded-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                <Link href="/community">커뮤니티 살펴보기</Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-4500">
            <Image
              src="/community/rooms/home-hero-v3.jpg"
              alt="늦은 밤 작업 중인 ZERO-ONE 멤버"
              fill
              priority
              sizes="(max-width: 1023px) 50vw, 1px"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="relative hidden h-home-hero-mobile overflow-hidden bg-gray-1000 lg:block lg:h-3750 lg:rounded-t-200">
        <Image
          src="/community/rooms/home-hero-v3.jpg"
          alt="늦은 밤 작업 중인 ZERO-ONE 멤버"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-[center_26%]"
        />
        <div className="absolute inset-0 bg-home-scrim-base" />
        <div className="home-hero-local-scrim" />
        <div className="absolute right-225 bottom-250 left-225 z-10 text-white lg:right-auto lg:bottom-425 lg:left-home-hero-desktop-inset">
          <h1 className="text-[30px] leading-[1.2] font-black tracking-[-0.035em] lg:text-[40px] lg:leading-[1.16]">
            {HERO_TITLE_LINES[0]}
            <br />
            {HERO_TITLE_LINES[1]}
          </h1>
          <p className="mt-112 text-[16px] leading-[1.5] font-medium text-gray-200 lg:text-[15.5px]">
            {HERO_SUBTITLE}
          </p>
          <p className="mt-125 flex items-center gap-75 font-designer-12b font-bold text-gray-200">
            <span className="size-75 rounded-full bg-green-500" aria-hidden />
            {LIVE_ROOM_COPY}
          </p>
        </div>
      </section>
    </>
  );
}
