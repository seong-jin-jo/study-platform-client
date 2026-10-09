'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import IconButton from '@/components/common/ui/icon-button';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  appearance?: 'compact' | 'lesson';
  precision?: 'half' | 'whole';
}

const LESSON_HINTS = [
  '별점을 눌러주세요.',
  '어려웠어요',
  '조금 어려웠어요',
  '보통이에요',
  '재밌었어요',
  '너무 재밌었어요',
] as const;

const roundToNearestHalf = (num: number) => {
  if (num === 0) {
    return Number((Math.round(num * 2) / 2).toFixed(1));
  }

  return Math.round(num * 2) / 2;
};

export default function StarRatingInput({
  value,
  onChange,
  appearance = 'compact',
  precision = 'half',
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const normalizeRating = (rating: number) =>
    precision === 'whole' ? Math.round(rating) : roundToNearestHalf(rating);
  const displayValue = normalizeRating(hoverValue > 0 ? hoverValue : value);

  const getStarFill = (idx: number): 'full' | 'half' | 'empty' => {
    const score = idx + 1;
    if (displayValue >= score) return 'full';
    if (displayValue >= score - 0.5) return 'half';

    return 'empty';
  };

  const getValueFromX = (
    clientX: number,
    rect: DOMRect,
    idx: number,
  ): number => {
    const x = clientX - rect.left;

    return precision === 'half' && x < rect.width / 2 ? idx + 0.5 : idx + 1;
  };

  const stars = Array.from({ length: 5 }).map((_, idx) => {
    const fill = getStarFill(idx);

    return (
      <IconButton
        key={`star-${idx + 1}`}
        label={`${idx + 1}점`}
        size="xs"
        className={cn(
          'relative rounded-none p-0 hover:bg-transparent',
          appearance === 'lesson' ? 'size-525' : 'size-300',
        )}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverValue(getValueFromX(e.clientX, rect, idx));
        }}
        onMouseLeave={() => setHoverValue(0)}
        onClick={(e) => {
          if (e.detail === 0) {
            onChange(idx + 1);
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            onChange(getValueFromX(e.clientX, rect, idx));
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          const touch = e.changedTouches[0];
          if (touch) {
            const rect = e.currentTarget.getBoundingClientRect();
            onChange(getValueFromX(touch.clientX, rect, idx));
          }
        }}
      >
        {appearance === 'lesson' ? (
          <>
            <Image
              src="/class/star-disabled.svg"
              alt=""
              aria-hidden="true"
              width={42}
              height={42}
            />
            {fill !== 'empty' && (
              <span
                className={cn(
                  'absolute inset-0 overflow-hidden',
                  fill === 'half' ? 'w-1/2' : 'w-full',
                )}
              >
                <Image
                  src="/class/star-enabled.svg"
                  alt=""
                  aria-hidden="true"
                  width={42}
                  height={42}
                />
              </span>
            )}
          </>
        ) : (
          <>
            <Star className="h-300 w-300 shrink-0 fill-current text-icon-disabled" />
            {fill !== 'empty' && (
              <span
                className={cn(
                  'absolute inset-0 overflow-hidden',
                  fill === 'half' ? 'w-1/2' : 'w-full',
                )}
              >
                <Star className="h-300 w-300 shrink-0 fill-current text-text-warning" />
              </span>
            )}
          </>
        )}
      </IconButton>
    );
  });

  if (appearance === 'lesson') {
    return (
      <div className="mb-375 flex h-1500 w-full flex-col items-center justify-center gap-100 rounded-200 border border-gray-300 bg-background-default">
        <div className="flex items-center justify-center gap-200">{stars}</div>
        <p className="mt-200 text-center font-designer-14sb text-gray-400">
          {LESSON_HINTS[Math.ceil(displayValue)]}
        </p>
      </div>
    );
  }

  return <div className="flex items-center gap-50">{stars}</div>;
}
