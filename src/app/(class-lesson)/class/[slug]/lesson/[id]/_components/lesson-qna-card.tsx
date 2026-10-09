'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import {
  ModeCommentIcon,
  ModeEditIcon,
} from '@/components/common/ui/icons/course-icons';
import type {
  BuilderQnaSidebarItem,
  LessonQnaSidebarItem,
} from '@/types/api/course.types';
import { getRichContentVisibleText } from '@/utils/markdown-content-text';

interface Props {
  myQnas: LessonQnaSidebarItem[];
  builderQnas: BuilderQnaSidebarItem[];
  onAskClick: () => void;
  onSelectQna: (qnaId: number) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function LessonQnaCard({
  myQnas,
  builderQnas,
  onAskClick,
  onSelectQna,
}: Props) {
  const [page, setPage] = useState(0);
  const total = myQnas.length;
  const hasMyQna = total > 0;
  const current = hasMyQna ? myQnas[Math.min(page, total - 1)] : null;

  return (
    <div className="flex flex-col gap-300 rounded-150 border border-gray-300 bg-background-default p-300">
      <div className="flex flex-col gap-125">
        <p className="text-center font-designer-16b text-gray-1000">
          여기서 막히셨나요?
        </p>
        <p className="text-center font-designer-14r text-gray-1000">
          30분 이상 막히면 바로 질문하기!
          <br />
          질문을 남겨주시면 빠르게 답변드립니다.
        </p>
      </div>

      <Button
        type="button"
        onClick={onAskClick}
        color="primary"
        size="large"
        className="h-auto w-full py-200 hover:bg-fill-brand-default-default active:bg-fill-brand-default-default"
      >
        <ModeEditIcon className="size-250" />
        질문하기
      </Button>

      <div className="flex flex-col gap-150">
        <div className="flex items-center gap-125">
          <p className="font-designer-14b text-gray-1000">내 질문</p>
          <span className="rounded-100 bg-gray-200 px-100 font-designer-14b text-gray-600">
            {total}
          </span>
        </div>

        <div className="flex flex-col gap-100">
          <div className="relative">
            {hasMyQna && (
              <Button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="이전 질문"
                className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute -left-300 top-1/2 -translate-y-1/2 text-border-default disabled:opacity-50"
              >
                <ChevronLeft className="size-300" />
              </Button>
            )}

            {current ? (
              <Button
                type="button"
                onClick={() => onSelectQna(current.qnaId)}
                className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents flex w-full items-center gap-125 rounded-100 border border-border-subtle bg-gray-100 p-150 text-left hover:border-border-brand"
              >
                <p className="flex-1 truncate font-designer-14b text-gray-800">
                  {getRichContentVisibleText(current.title)}
                </p>
                <div className="flex shrink-0 items-center gap-50 font-designer-13m text-gray-400">
                  <ModeCommentIcon className="size-225" />
                  <p className="shrink-0 font-designer-13m text-gray-400">
                    {formatDate(current.createdAt)}
                  </p>
                  <span>{current.answerCount}</span>
                </div>
              </Button>
            ) : (
              <p className="rounded-100 border border-border-subtle bg-gray-100 p-150 text-center font-designer-13m text-gray-400">
                아직 질문이 없어요.
              </p>
            )}

            {hasMyQna && (
              <Button
                type="button"
                onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                disabled={page >= total - 1}
                aria-label="다음 질문"
                className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute -right-300 top-1/2 -translate-y-1/2 text-border-default disabled:opacity-50"
              >
                <ChevronRight className="size-300" />
              </Button>
            )}
          </div>

          {hasMyQna && total > 1 && (
            <div className="flex justify-center gap-50">
              {myQnas.map((q, i) => (
                <span
                  key={q.qnaId}
                  className={cn(
                    'h-75 w-75 rounded-full',
                    i === page ? 'bg-background-brand-default' : 'bg-gray-300',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-150">
        <div className="flex items-center gap-125">
          <p className="font-designer-14b text-gray-1000">빌더들의 질문</p>
          <span className="rounded-100 bg-gray-200 px-100 font-designer-14b text-gray-600">
            {builderQnas.length}
          </span>
        </div>

        {builderQnas.length > 0 ? (
          <div className="flex flex-col gap-125">
            {builderQnas.map((q, i) => (
              <Button
                key={q.qnaId ?? i}
                type="button"
                onClick={() => onSelectQna(q.qnaId)}
                className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents flex h-1250 w-full flex-col gap-50 overflow-hidden rounded-100 border border-gray-200 bg-gray-100 px-150 py-175 text-left hover:border-border-brand"
              >
                <div className="flex w-full items-center gap-125">
                  <p className="flex-1 truncate font-designer-14b text-gray-800">
                    {getRichContentVisibleText(q.title)}
                  </p>
                  <p className="shrink-0 font-designer-13m text-gray-400">
                    {formatDate(q.createdAt)}
                  </p>
                  <div className="flex shrink-0 items-center gap-50">
                    <ModeCommentIcon className="size-225 text-gray-400" />
                    <span className="font-designer-13m text-gray-400">
                      {q.answerCount}
                    </span>
                  </div>
                </div>
                {q.preview && (
                  <p className="line-clamp-2 font-designer-14r text-gray-1000">
                    {getRichContentVisibleText(q.preview)}
                  </p>
                )}
              </Button>
            ))}
          </div>
        ) : (
          <p className="rounded-100 border border-border-subtle bg-gray-100 p-150 text-center font-designer-13m text-gray-400">
            아직 질문이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
