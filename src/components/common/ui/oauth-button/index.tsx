'use client';

import Image from 'next/image';
import * as React from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const PROVIDER_CONFIG = {
  google: {
    icon: '/google-icon.svg',
    label: 'Google 계정 로그인',
    style:
      'border border-border-default bg-background-default text-text-default',
  },
  kakao: {
    icon: '/kakao-icon.svg',
    label: '카카오 계정 로그인',
    style: 'border border-[#FEE500] bg-[#FEE500] text-[#191919]',
  },
} as const;

type OAuthProvider = keyof typeof PROVIDER_CONFIG;

interface OAuthButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'children' | 'type'
  > {
  loading?: boolean;
  provider: OAuthProvider;
}

function OAuthButton({
  className,
  disabled,
  loading = false,
  provider,
  ...props
}: OAuthButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-600 w-full max-w-6000 cursor-pointer items-center justify-center gap-100 rounded-100 px-200 font-designer-16b outline-none hover:opacity-[0.92] active:opacity-[0.85] focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-40',
        config.style,
        className,
      )}
      disabled={isDisabled}
      type="button"
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-175 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <Image
          alt=""
          aria-hidden="true"
          height={20}
          src={config.icon}
          width={20}
        />
      )}
      <span>{config.label}</span>
    </button>
  );
}

export default OAuthButton;
export type { OAuthButtonProps, OAuthProvider };
