'use client';

import { MotionConfig } from 'framer-motion';

export const MOTION_REDUCED_MOTION_POLICY = 'user' as const;

export default function MotionProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MotionConfig reducedMotion={MOTION_REDUCED_MOTION_POLICY}>
      {children}
    </MotionConfig>
  );
}
