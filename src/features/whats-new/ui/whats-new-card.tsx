'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { hasClientMemberSession } from '@/features/auth/model/use-auth';
import { useOnboardingStore } from '@/stores/use-onboarding-store';
import { WhatsNewCardView } from './whats-new-card-view';
import { getLatestReleaseNote } from '../model/release-notes';
import {
  trackWhatsNewFeedback,
  trackWhatsNewTry,
} from '../model/whats-new-events';
import {
  buildFeedbackHref,
  readLastSeenVersion,
  recordWhatsNewShown,
  shouldShowWhatsNewCard,
  WHATS_NEW_SHOW_DELAY_MS,
  writeLastSeenVersion,
} from '../model/whats-new-policy';

/** whats_new_feedback 의 method. 회원은 기존 문의 화면, 비회원은 로그인 모달(로그인 뒤 문의 화면). */
const FEEDBACK_METHOD_MEMBER = 'inquiry_link';
const FEEDBACK_METHOD_GUEST = 'login_modal';

/**
 * 루트 레이아웃에 한 번 마운트한다. 최신 공개 기록이 notify:true 이고
 * 이 브라우저가 아직 그 버전을 보지 않았을 때만 카드를 띄운다.
 * 닫기·써 보기·의견 남기기 중 하나를 누르면 그 버전을 저장해 다시 뜨지 않는다.
 */
export function WhatsNewCard() {
  const pathname = usePathname();
  const isOnboardingOpen = useOnboardingStore((state) => state.isOpen);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | undefined>();
  const [isStorageRead, setIsStorageRead] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [isDelayElapsed, setIsDelayElapsed] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<
    string | undefined
  >();
  const viewedVersionRef = useRef<string | undefined>(undefined);
  const latest = getLatestReleaseNote();

  useEffect(() => {
    setLastSeenVersion(readLastSeenVersion());
    setIsGuest(!hasClientMemberSession());
    setIsStorageRead(true);
    const timer = window.setTimeout(
      () => setIsDelayElapsed(true),
      WHATS_NEW_SHOW_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const isVisible =
    isStorageRead &&
    isDelayElapsed &&
    latest?.version !== dismissedVersion &&
    shouldShowWhatsNewCard({
      latest,
      lastSeenVersion,
      pathname,
      isBlockedByOtherFlow: isOnboardingOpen,
    });

  // 카드가 실제로 보이는 순간 버전당 한 번만 이벤트를 보내고, 그 버전을 봤다고 저장한다.
  useEffect(() => {
    if (!isVisible || !latest || viewedVersionRef.current === latest.version) {
      return;
    }
    viewedVersionRef.current = latest.version;
    recordWhatsNewShown(latest.version);
  }, [isVisible, latest]);

  if (!isVisible || !latest) return null;

  const markSeen = () => {
    writeLastSeenVersion(latest.version);
    setDismissedVersion(latest.version);
  };

  return (
    <WhatsNewCardView
      note={latest}
      feedbackHref={buildFeedbackHref(latest.version)}
      isGuest={isGuest}
      onClose={markSeen}
      onTry={() => {
        trackWhatsNewTry(latest.version, latest.try_href ?? '');
        markSeen();
      }}
      onFeedback={() => {
        if (isGuest) {
          // 로그인 모달이 카드 안에 있으므로 카드를 닫지 않는다(닫으면 모달도 사라진다).
          // 버전만 저장해 로그인 후 돌아와서 카드가 다시 뜨지 않게 한다.
          trackWhatsNewFeedback(latest.version, FEEDBACK_METHOD_GUEST);
          writeLastSeenVersion(latest.version);
          return;
        }
        trackWhatsNewFeedback(latest.version, FEEDBACK_METHOD_MEMBER);
        markSeen();
      }}
    />
  );
}
