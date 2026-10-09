// 특정 컴포넌트가 아니라 전역 CSS 토큰 전체를 검증하므로 design-system 예외 폴더에 둔다.
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import SurfacePanel from '@/components/common/ui/surface-panel';

interface VisualToken {
  name: `--${string}`;
  className: string;
}

const SEMANTIC_COLOR_GROUPS: { label: string; tokens: VisualToken[] }[] = [
  {
    label: 'Text',
    tokens: [
      { name: '--color-text-subtle', className: 'bg-text-subtle' },
      { name: '--color-text-brand', className: 'bg-text-brand' },
      {
        name: '--color-text-brand-strong',
        className: 'bg-text-brand-strong',
      },
      { name: '--color-text-default', className: 'bg-text-default' },
      { name: '--color-text-disabled', className: 'bg-text-disabled' },
      {
        name: '--color-text-disabled-strong',
        className: 'bg-text-disabled-strong',
      },
      { name: '--color-text-error', className: 'bg-text-error' },
      { name: '--color-text-strong', className: 'bg-text-strong' },
      { name: '--color-text-subtlest', className: 'bg-text-subtlest' },
      { name: '--color-text-success', className: 'bg-text-success' },
      { name: '--color-text-warning', className: 'bg-text-warning' },
      {
        name: '--color-text-information',
        className: 'bg-text-information',
      },
      { name: '--color-text-inverse', className: 'bg-text-inverse' },
    ],
  },
  {
    label: 'Icon',
    tokens: [
      { name: '--color-icon-brand', className: 'bg-icon-brand' },
      { name: '--color-icon-default', className: 'bg-icon-default' },
      { name: '--color-icon-disabled', className: 'bg-icon-disabled' },
      { name: '--color-icon-error', className: 'bg-icon-error' },
      { name: '--color-icon-strong', className: 'bg-icon-strong' },
      { name: '--color-icon-subtlest', className: 'bg-icon-subtlest' },
      {
        name: '--color-icon-information',
        className: 'bg-icon-information',
      },
      { name: '--color-icon-inverse', className: 'bg-icon-inverse' },
    ],
  },
  {
    label: 'Border',
    tokens: [
      { name: '--color-border-subtle', className: 'bg-border-subtle' },
      { name: '--color-border-brand', className: 'bg-border-brand' },
      { name: '--color-border-default', className: 'bg-border-default' },
      { name: '--color-border-disabled', className: 'bg-border-disabled' },
      { name: '--color-border-error', className: 'bg-border-error' },
      { name: '--color-border-strong', className: 'bg-border-strong' },
      { name: '--color-border-subtlest', className: 'bg-border-subtlest' },
      { name: '--color-border-success', className: 'bg-border-success' },
      { name: '--color-border-warning', className: 'bg-border-warning' },
      {
        name: '--color-border-information',
        className: 'bg-border-information',
      },
      { name: '--color-border-inverse', className: 'bg-border-inverse' },
    ],
  },
  {
    label: 'Background',
    tokens: [
      {
        name: '--color-background-alternative',
        className: 'bg-background-alternative',
      },
      {
        name: '--color-background-default',
        className: 'bg-background-default',
      },
      {
        name: '--color-background-dimmer',
        className: 'bg-background-dimmer',
      },
      {
        name: '--color-background-disabled',
        className: 'bg-background-disabled',
      },
      {
        name: '--color-background-danger-default',
        className: 'bg-background-danger-default',
      },
      {
        name: '--color-background-brand-subtle',
        className: 'bg-background-brand-subtle',
      },
      {
        name: '--color-background-brand-default',
        className: 'bg-background-brand-default',
      },
      {
        name: '--color-background-neutral-subtle',
        className: 'bg-background-neutral-subtle',
      },
      {
        name: '--color-background-neutral-strong',
        className: 'bg-background-neutral-strong',
      },
      {
        name: '--color-background-accent-blue-subtle',
        className: 'bg-background-accent-blue-subtle',
      },
      {
        name: '--color-background-accent-blue-default',
        className: 'bg-background-accent-blue-default',
      },
      {
        name: '--color-background-accent-blue-strong',
        className: 'bg-background-accent-blue-strong',
      },
      {
        name: '--color-background-accent-gray-subtle',
        className: 'bg-background-accent-gray-subtle',
      },
      {
        name: '--color-background-accent-gray-default',
        className: 'bg-background-accent-gray-default',
      },
      {
        name: '--color-background-accent-gray-strong',
        className: 'bg-background-accent-gray-strong',
      },
      {
        name: '--color-background-accent-green-subtle',
        className: 'bg-background-accent-green-subtle',
      },
      {
        name: '--color-background-accent-indigo-subtle',
        className: 'bg-background-accent-indigo-subtle',
      },
      {
        name: '--color-background-accent-orange-subtle',
        className: 'bg-background-accent-orange-subtle',
      },
      {
        name: '--color-background-accent-orange-strong',
        className: 'bg-background-accent-orange-strong',
      },
      {
        name: '--color-background-accent-pink-subtle',
        className: 'bg-background-accent-pink-subtle',
      },
      {
        name: '--color-background-accent-purple-subtle',
        className: 'bg-background-accent-purple-subtle',
      },
      {
        name: '--color-background-accent-purple-strong',
        className: 'bg-background-accent-purple-strong',
      },
      {
        name: '--color-background-accent-red-subtle',
        className: 'bg-background-accent-red-subtle',
      },
      {
        name: '--color-background-accent-rose-subtle',
        className: 'bg-background-accent-rose-subtle',
      },
      {
        name: '--color-background-accent-rose-strong',
        className: 'bg-background-accent-rose-strong',
      },
      {
        name: '--color-background-accent-yellow-subtle',
        className: 'bg-background-accent-yellow-subtle',
      },
    ],
  },
  {
    label: 'Fill',
    tokens: [
      {
        name: '--color-fill-brand-default-default',
        className: 'bg-fill-brand-default-default',
      },
      {
        name: '--color-fill-brand-default-hover',
        className: 'bg-fill-brand-default-hover',
      },
      {
        name: '--color-fill-brand-default-pressed',
        className: 'bg-fill-brand-default-pressed',
      },
      {
        name: '--color-fill-brand-strong-default',
        className: 'bg-fill-brand-strong-default',
      },
      {
        name: '--color-fill-brand-subtle-default',
        className: 'bg-fill-brand-subtle-default',
      },
      {
        name: '--color-fill-brand-subtle-hover',
        className: 'bg-fill-brand-subtle-hover',
      },
      {
        name: '--color-fill-danger-default-default',
        className: 'bg-fill-danger-default-default',
      },
      {
        name: '--color-fill-danger-subtle-default',
        className: 'bg-fill-danger-subtle-default',
      },
      {
        name: '--color-fill-information-default-default',
        className: 'bg-fill-information-default-default',
      },
      {
        name: '--color-fill-information-subtle-default',
        className: 'bg-fill-information-subtle-default',
      },
      {
        name: '--color-fill-information-subtle-hover',
        className: 'bg-fill-information-subtle-hover',
      },
      {
        name: '--color-fill-information-subtle-pressed',
        className: 'bg-fill-information-subtle-pressed',
      },
      {
        name: '--color-fill-neutral-default-default',
        className: 'bg-fill-neutral-default-default',
      },
      {
        name: '--color-fill-neutral-default-hover',
        className: 'bg-fill-neutral-default-hover',
      },
      {
        name: '--color-fill-neutral-default-pressed',
        className: 'bg-fill-neutral-default-pressed',
      },
      {
        name: '--color-fill-neutral-strong-default',
        className: 'bg-fill-neutral-strong-default',
      },
      {
        name: '--color-fill-neutral-subtle-default',
        className: 'bg-fill-neutral-subtle-default',
      },
      {
        name: '--color-fill-neutral-subtle-hover',
        className: 'bg-fill-neutral-subtle-hover',
      },
      {
        name: '--color-fill-neutral-subtle-pressed',
        className: 'bg-fill-neutral-subtle-pressed',
      },
      {
        name: '--color-fill-success-default-default',
        className: 'bg-fill-success-default-default',
      },
      {
        name: '--color-fill-success-subtle-default',
        className: 'bg-fill-success-subtle-default',
      },
      {
        name: '--color-fill-warning-default-default',
        className: 'bg-fill-warning-default-default',
      },
      {
        name: '--color-fill-warning-subtle-default',
        className: 'bg-fill-warning-subtle-default',
      },
    ],
  },
];

const SPACING_TOKENS: VisualToken[] = [
  { name: '--spacing-0', className: 'w-0' },
  { name: '--spacing-25', className: 'w-25' },
  { name: '--spacing-50', className: 'w-50' },
  { name: '--spacing-75', className: 'w-75' },
  { name: '--spacing-100', className: 'w-100' },
  { name: '--spacing-150', className: 'w-150' },
  { name: '--spacing-200', className: 'w-200' },
  { name: '--spacing-250', className: 'w-250' },
  { name: '--spacing-300', className: 'w-300' },
  { name: '--spacing-400', className: 'w-400' },
  { name: '--spacing-500', className: 'w-500' },
  { name: '--spacing-600', className: 'w-600' },
  { name: '--spacing-800', className: 'w-800' },
  { name: '--spacing-1000', className: 'w-1000' },
];

const RADIUS_TOKENS: VisualToken[] = [
  { name: '--radius-25', className: 'rounded-25' },
  { name: '--radius-50', className: 'rounded-50' },
  { name: '--radius-75', className: 'rounded-75' },
  { name: '--radius-100', className: 'rounded-100' },
  { name: '--radius-125', className: 'rounded-125' },
  { name: '--radius-150', className: 'rounded-150' },
  { name: '--radius-175', className: 'rounded-175' },
  { name: '--radius-200', className: 'rounded-200' },
  { name: '--radius-250', className: 'rounded-250' },
  { name: '--radius-300', className: 'rounded-300' },
  { name: '--radius-375', className: 'rounded-375' },
  { name: '--radius-500', className: 'rounded-500' },
  { name: '--radius-750', className: 'rounded-750' },
  { name: '--radius-2000', className: 'rounded-2000' },
];

const SHADOW_TOKENS: VisualToken[] = [
  { name: '--shadow-1', className: 'shadow-1' },
  { name: '--shadow-2', className: 'shadow-2' },
  { name: '--shadow-brand-card', className: 'shadow-brand-card' },
  { name: '--shadow-3', className: 'shadow-3' },
  { name: '--shadow-4', className: 'shadow-4' },
];

const TYPOGRAPHY_CLASSES = [
  'font-designer-36b',
  'font-designer-32b',
  'font-designer-24b',
  'font-designer-20b',
  'font-designer-18b',
  'font-designer-16b',
  'font-designer-16r',
  'font-designer-15m',
  'font-designer-14b',
  'font-designer-14r',
  'font-designer-13b',
  'font-designer-12m',
] as const;

function useCustomProperty(name: string) {
  const [value, setValue] = useState('불러오는 중');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      setValue(computed || '정의 없음');
    });

    return () => cancelAnimationFrame(frame);
  }, [name]);

  return value;
}

function TokenLabel({ name }: { name: string }) {
  const value = useCustomProperty(name);

  return (
    <div className="min-w-0">
      <p className="font-designer-12b text-text-default break-all">{name}</p>
      <p className="font-designer-11r text-text-subtle break-all">{value}</p>
    </div>
  );
}

function ColorToken({ token }: { token: VisualToken }) {
  return (
    <div className="flex items-center gap-100">
      <div
        className={cn(
          'border-border-subtle size-500 shrink-0 rounded-100 border',
          token.className,
        )}
      />
      <TokenLabel name={token.name} />
    </div>
  );
}

function TypographyToken({ className }: { className: string }) {
  const sampleRef = useRef<HTMLParagraphElement>(null);
  const [value, setValue] = useState('불러오는 중');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!sampleRef.current) return;
      const computed = getComputedStyle(sampleRef.current);
      setValue(
        `${computed.fontSize} / ${computed.fontWeight} / ${computed.lineHeight}`,
      );
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="border-border-subtle flex flex-col gap-50 border-b py-150">
      <p ref={sampleRef} className={cn(className, 'text-text-default')}>
        당신의 0을, 우리의 1로
      </p>
      <p className="font-designer-11r text-text-subtle">
        {className}: {value}
      </p>
    </div>
  );
}

function TokenGallery() {
  return (
    <main className="bg-background-alternative flex flex-col gap-600 p-400">
      <header className="flex flex-col gap-100">
        <h1 className="font-designer-32b text-text-strong">
          ZERO-ONE 디자인 토큰
        </h1>
        <p className="font-designer-14r text-text-subtle">
          global.css가 로드한 실제 사용자 정의 속성과 계산된 타이포 값을
          표시합니다.
        </p>
      </header>

      <section className="flex flex-col gap-300">
        <h2 className="font-designer-20b text-text-strong">시맨틱 컬러</h2>
        {SEMANTIC_COLOR_GROUPS.map((group) => (
          <SurfacePanel key={group.label} radius="lg" className="p-300">
            <h3 className="font-designer-16b text-text-default mb-200">
              {group.label}
            </h3>
            <div className="grid gap-200 md:grid-cols-2 xl:grid-cols-3">
              {group.tokens.map((token) => (
                <ColorToken key={token.name} token={token} />
              ))}
            </div>
          </SurfacePanel>
        ))}
      </section>

      <section className="grid gap-300 lg:grid-cols-2">
        <SurfacePanel radius="lg" className="p-300">
          <h2 className="font-designer-20b text-text-strong mb-300">
            기본 간격 14단계
          </h2>
          <div className="flex flex-col gap-150">
            {SPACING_TOKENS.map((token) => (
              <div key={token.name} className="grid grid-cols-2 gap-200">
                <TokenLabel name={token.name} />
                <div className="border-border-subtle flex h-300 items-center border-b">
                  <div
                    className={cn(
                      'bg-background-brand-default h-100',
                      token.className,
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel radius="lg" className="p-300">
          <h2 className="font-designer-20b text-text-strong mb-300">
            모서리 실제 정의
          </h2>
          <div className="grid gap-200 sm:grid-cols-2">
            {RADIUS_TOKENS.map((token) => (
              <div key={token.name} className="flex items-center gap-150">
                <div
                  className={cn(
                    'bg-background-brand-default size-700 shrink-0',
                    token.className,
                  )}
                />
                <TokenLabel name={token.name} />
              </div>
            ))}
          </div>
        </SurfacePanel>
      </section>

      <section className="grid gap-300 lg:grid-cols-2">
        <SurfacePanel radius="lg" className="p-300">
          <h2 className="font-designer-20b text-text-strong mb-300">그림자</h2>
          <div className="grid gap-400 sm:grid-cols-2">
            {SHADOW_TOKENS.map((token) => (
              <div key={token.name} className="flex flex-col gap-150">
                <div
                  className={cn(
                    'bg-background-default size-1000 rounded-200',
                    token.className,
                  )}
                />
                <TokenLabel name={token.name} />
              </div>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel radius="lg" className="p-300">
          <h2 className="font-designer-20b text-text-strong mb-300">
            타이포 위계
          </h2>
          <div>
            {TYPOGRAPHY_CLASSES.map((className) => (
              <TypographyToken key={className} className={className} />
            ))}
          </div>
        </SurfacePanel>
      </section>
    </main>
  );
}

const meta: Meta<typeof TokenGallery> = {
  title: 'Design System/Tokens',
  component: TokenGallery,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TokenGallery>;

export const AllTokens: Story = {};
