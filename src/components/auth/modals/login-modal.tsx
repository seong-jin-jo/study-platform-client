'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { testLogin } from '@/api/endpoints/auth/test-login';
import Button from '@/components/common/ui/button';
import { Modal } from '@/components/common/ui/modal';
import OAuthButton from '@/components/common/ui/oauth-button';
import { AUTH_ROUTE_PATHS } from '@/features/auth/model/auth-route';
import {
  normalizeOAuthCallbackPath,
  storeOAuthCallbackPath,
} from '@/features/auth/model/oauth-callback';
import { resetClientDerivedAuthStateWithQueryCache } from '@/features/auth/model/client-auth-cleanup';
import { writeExistingMemberSession } from '@/features/auth/model/client-auth-session';
import { useToastStore } from '@/stores/use-toast-store';
import { getAttributionParams } from '@/utils/attribution-tracker';

const handleSocialLoginClick = (provider: 'kakao' | 'google') => {
  sendGTMEvent({
    event: 'social_login_click',
    provider,
  });
};

// origin은 클릭 시점(클라이언트)에 읽어 state로 전달 — 컴포넌트 상태 비참조 → 모듈 스코프.
// client_id/scope/redirect_uri는 서버가 구성한다. 프론트 번들에 client_id를 박지 않으므로
// 배포/캐시와 무관하게 항상 최신 설정이 적용된다(백엔드 authorize 엔드포인트로만 이동).
const redirectToOAuth = (
  provider: 'kakao' | 'google',
  callbackPath?: string,
) => {
  handleSocialLoginClick(provider);
  storeOAuthCallbackPath(callbackPath);

  const state = encodeURIComponent(window.location.origin);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  window.location.href = `${API_BASE_URL}/api/v1/auth/${provider}/authorize?state=${state}`;
};

export default function LoginModal({
  openTrigger,
  callbackPath,
}: {
  openTrigger: ReactNode;
  callbackPath?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

  // Test Login State
  const [testMemberId, setTestMemberId] = useState('1');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === 'true';

  const handleTestLogin = async () => {
    if (!testMemberId) return;

    setIsTestLoading(true);
    try {
      const { accessToken, memberId, profileImageUrl } = await testLogin(
        Number(testMemberId),
      );

      resetClientDerivedAuthStateWithQueryCache();
      const hasSavedExistingMemberSession = writeExistingMemberSession({
        accessToken,
        memberId,
        profileImageUrl,
      });

      if (!hasSavedExistingMemberSession) {
        showToast(
          '로그인 세션 저장에 실패했습니다. 다시 시도해주세요.',
          'error',
        );

        return;
      }

      setIsOpen(false);
      router.push(normalizeOAuthCallbackPath(callbackPath));
      router.refresh();

      // alert(`테스트 로그인 성공! (ID: ${memberId})`);
    } catch (error) {
      console.error('Test login failed:', error);
      showToast('테스트 로그인 실패 (백엔드 실행 여부를 확인하세요)', 'error');
    } finally {
      setIsTestLoading(false);
    }
  };

  // 모달 열릴 때 분석 이벤트 전송 — effect 대신 open 핸들러에서 처리.
  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (next) {
      const attributionParams = getAttributionParams();

      sendGTMEvent({
        event: 'login_modal_open',
        ...attributionParams,
      });
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Trigger asChild>{openTrigger}</Modal.Trigger>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header className="flex items-center justify-between">
            <Modal.Title />{' '}
            <Modal.Close>
              <XIcon />
            </Modal.Close>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-300 flex min-h-[160px] flex-col items-center justify-center gap-150 py-300">
              <div className="font-designer-32b w-full text-center text-[#202020]">
                로그인
              </div>
              <div className="font-designer-20m text-text-default mt-2 text-center">
                ZERO - ONE에 오신 것을 환영합니다.
              </div>
            </div>
            <div className="flex flex-col items-center gap-150 py-150">
              {/* <button
                className="flex h-[52px] px-5 justify-center items-center gap-150 rounded bg-[#03C75A]"
                onClick={() => { window.location.href = NAVER_LOGIN_URL }}
              >
                <Image src="/naver-icon.svg" alt="Naver" width={20} height={20} />
                <span className="text-[#FFF] text-center font-['Pretendard'] text-[15px] font-bold leading-[23px]">
                  네이버 계정 로그인
                </span>
              </button> */}
              <OAuthButton
                provider="kakao"
                onClick={() => redirectToOAuth('kakao', callbackPath)}
              />
              <OAuthButton
                provider="google"
                onClick={() => redirectToOAuth('google', callbackPath)}
              />
            </div>

            {/* Test Login Section (Dev Only) */}
            {isDev && (
              <div className="border-border-default mt-2 w-full border-t pt-4">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="text-text-subtle font-designer-12b font-bold">
                    🧪 개발자 테스트 로그인
                  </span>
                </div>
                <div className="flex h-[40px] justify-center gap-2">
                  <input
                    type="number"
                    aria-label="테스트 Member ID"
                    value={testMemberId}
                    onChange={(e) => setTestMemberId(e.target.value)}
                    placeholder="Member ID"
                    className="border-border-default focus:ring-fill-brand-default-default w-full max-w-1500 rounded-md border px-3 py-1 text-sm focus:ring-2 focus:outline-none"
                    min="1"
                  />
                  <Button
                    type="button"
                    onClick={handleTestLogin}
                    disabled={isTestLoading}
                    color="secondary"
                    size="small"
                    className="border-border-default h-auto rounded-md border px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    {isTestLoading ? '...' : '로그인'}
                  </Button>
                </div>
                <p className="text-text-subtlest mt-2 text-center font-designer-12r">
                  * 로컬/개발 환경에서만 보입니다 (Member ID 입력)
                </p>
              </div>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
