import { X } from 'lucide-react';
import Link from 'next/link';
import LoginModal from '@/components/auth/modals/login-modal';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import type { ReleaseNote } from '../model/release-notes';

interface WhatsNewCardViewProps {
  note: ReleaseNote;
  feedbackHref: string;
  /** 비회원이면 문의 화면(회원 전용) 대신 로그인 모달을 열고, 로그인 뒤 feedbackHref 로 돌아온다 */
  isGuest: boolean;
  onTry: () => void;
  onFeedback: () => void;
  onClose: () => void;
}

/**
 * "새로운 기능" 카드의 화면. 상태·저장·이벤트는 whats-new-card.tsx 가 맡는다.
 * 전면 차단이 아니라 구석에 놓이는 작은 카드이고, 닫기 버튼이 항상 있다.
 */
export function WhatsNewCardView({
  note,
  feedbackHref,
  isGuest,
  onTry,
  onFeedback,
  onClose,
}: WhatsNewCardViewProps) {
  // 카드는 첫 줄만 보여 준다(문장 중간이 말줄임으로 잘리지 않게). 나머지는 /updates 에 있다.
  const description = note.body[0];
  return (
    <aside
      aria-label="새로운 기능 안내"
      data-testid="whats-new-card"
      className={cn(
        'fixed inset-x-200 z-40 rounded-200 border border-border-subtle bg-background-default p-200 shadow-1',
        'whats-new-card-position md:inset-x-auto md:bottom-400 md:left-400 md:w-4500',
      )}
    >
      <div className="flex items-start gap-100">
        <div className="min-w-0 flex-1">
          <p className="font-designer-13b text-text-brand">새로운 기능</p>
          <h2 className="mt-50 font-designer-16b text-text-strong">
            {note.title}
          </h2>
          <p className="mt-50 line-clamp-2 break-keep font-designer-14r text-text-subtle">
            {description}
          </p>
        </div>
        <button
          type="button"
          aria-label="새로운 기능 안내 닫기"
          data-testid="whats-new-close"
          onClick={onClose}
          className="-mt-100 -mr-100 flex min-h-550 min-w-550 shrink-0 cursor-pointer items-center justify-center rounded-100 text-text-subtle active:bg-fill-neutral-default-pressed"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      <div className="mt-150 flex gap-100">
        {note.try_href ? (
          <Button asChild size="small" className="flex-1">
            <Link
              href={note.try_href}
              data-testid="whats-new-try"
              onClick={onTry}
            >
              써 보기
            </Link>
          </Button>
        ) : null}
        {isGuest ? (
          <LoginModal
            callbackPath={feedbackHref}
            openTrigger={
              <Button
                type="button"
                size="small"
                color="outlined"
                className="flex-1"
                data-testid="whats-new-feedback"
                onClick={onFeedback}
              >
                의견 남기기
              </Button>
            }
          />
        ) : (
          <Button asChild size="small" color="outlined" className="flex-1">
            <Link
              href={feedbackHref}
              data-testid="whats-new-feedback"
              onClick={onFeedback}
            >
              의견 남기기
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
