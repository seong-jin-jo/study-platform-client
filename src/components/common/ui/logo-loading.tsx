'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * 로고 마크(public/icons/logo.svg) 두 조각이 180ms 시차로 밝아지는
 * 전체 페이지 로딩 표시. 회장 결정 2026-08-24 "1안 로고가 흐른다" 반영.
 * 프로토타입: /tmp/s8live/proto-guest-loading.html B1.
 *
 * opacity/transform 만 사용해 리플로우·추가 네트워크 요청이 없다.
 * prefers-reduced-motion 은 앱 루트 MotionProvider(reducedMotion="user")가
 * framer-motion 전역으로 걸어주지만, 이 파일에서도 이중 방어로
 * motion-reduce 시 정지 상태(완전히 칠해짐)를 보장한다.
 */
export default function LogoLoading({
  label = '불러오는 중',
}: {
  label?: string;
}) {
  // 앱 루트 MotionProvider(reducedMotion="user")는 transform/layout
  // 애니메이션만 걸러내고 opacity 애니메이션은 통과시킨다. 이 컴포넌트는
  // opacity 만 움직이므로 여기서 직접 한 번 더 확인한다(이중 방어).
  const prefersReducedMotion = useReducedMotion();
  const staticOpacity = prefersReducedMotion ? 1 : undefined;

  return (
    <div
      className="flex flex-col items-center gap-150"
      role="status"
      aria-label={label}
    >
      <svg
        width="38"
        height="40"
        viewBox="0 0 19 20"
        fill="none"
        aria-hidden="true"
        className="text-icon-brand"
      >
        <motion.path
          d="M9.375 0.625H18.75L9.375 10H1.19209e-06L9.375 0.625Z"
          fill="currentColor"
          animate={
            prefersReducedMotion
              ? { opacity: staticOpacity }
              : { opacity: [0.18, 1, 0.18] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 1.4, repeat: Infinity, ease: [0.2, 0, 0, 1] }
          }
        />
        <motion.path
          d="M18.75 10L9.375 19.375L0 19.375L9.375 10H18.75Z"
          fill="currentColor"
          animate={
            prefersReducedMotion
              ? { opacity: staticOpacity }
              : { opacity: [0.18, 1, 0.18] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 1.4,
                  repeat: Infinity,
                  ease: [0.2, 0, 0, 1],
                  delay: 0.18,
                }
          }
        />
      </svg>
    </div>
  );
}
