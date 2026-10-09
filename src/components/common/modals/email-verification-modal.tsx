'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  useSendMyClassProfileEmailVerificationCodeMutation,
  useVerifyMyClassProfileEmailMutation,
} from '@/hooks/queries/user/use-my-class-profile-query';
import { extractErrorCode } from '@/utils/error';

type Step = 'input' | 'verify' | 'complete';

interface EmailVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 현재 등록된 이메일 (초기값) */
  initialEmail?: string;
  /** 인증 성공 시 갱신된 이메일 전달 */
  onVerificationComplete?: (email: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_TTL_SECONDS = 10 * 60; // BE EMAIL_VERIFICATION_TTL_MINUTES 와 동일

export default function EmailVerificationModal({
  open,
  onOpenChange,
  initialEmail,
  onVerificationComplete,
}: EmailVerificationModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(VERIFICATION_TTL_SECONDS);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: sendCode, isPending: isSendingCode } =
    useSendMyClassProfileEmailVerificationCodeMutation();
  const { mutate: verifyCode, isPending: isVerifying } =
    useVerifyMyClassProfileEmailMutation();

  // Portal 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 열릴 때 input 포커스
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, step]);

  // 모달이 닫히면 상태 초기화
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('input');
        setEmail(initialEmail ?? '');
        setCode('');
        setError('');
        setTimer(VERIFICATION_TTL_SECONDS);
      }, 200);
    }
  }, [open, initialEmail]);

  // verify 단계 타이머
  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);

      return () => clearInterval(interval);
    }
  }, [step, timer]);

  // ESC 키로 닫기 + 스크롤 잠금
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    setError('');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/[^0-9]/g, '');
    if (numbers.length <= 6) {
      setCode(numbers);
      setError('');
    }
  };

  const handleRequestCode = () => {
    if (!EMAIL_REGEX.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');

      return;
    }

    sendCode(
      { email },
      {
        onSuccess: () => {
          setStep('verify');
          setTimer(VERIFICATION_TTL_SECONDS);
          setError('');
        },
        onError: (err: unknown) => {
          const { message } = extractErrorCode(err);
          setError(
            message || '인증번호 발송에 실패했습니다. 다시 시도해주세요.',
          );
        },
      },
    );
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      setError('인증번호 6자리를 입력해주세요.');
      triggerShake();

      return;
    }

    verifyCode(
      { email, code },
      {
        onSuccess: (data) => {
          if (data?.emailUpdated) {
            setStep('complete');
            onVerificationComplete?.(data.email);
          } else {
            triggerShake();
            setError('인증에 실패했습니다. 다시 시도해주세요.');
          }
        },
        onError: (err: unknown) => {
          triggerShake();
          const { message } = extractErrorCode(err);
          setError(message || '인증번호가 올바르지 않습니다.');
          setCode('');
        },
      },
    );
  };

  if (!mounted || !open) return null;

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '480px',
    margin: '0 16px',
    padding: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'modalFadeIn 0.2s ease-out',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#111827',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  };

  const closeButton = (
    <button
      onClick={() => onOpenChange(false)}
      aria-label="닫기"
      style={{
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: '24px',
        color: '#9ca3af',
      }}
    >
      ✕
    </button>
  );

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        fontFamily:
          'var(--font-pretendard), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onClick={() => onOpenChange(false)}
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* STEP 1: 이메일 입력 */}
        {step === 'input' && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: '#111827',
                    margin: 0,
                  }}
                >
                  이메일을
                  <br />
                  인증해주세요
                </h2>
                <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                  입력한 이메일로 인증번호를 보내드려요.
                </p>
              </div>
              {closeButton}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <input
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="이메일 주소 입력"
                value={email}
                onChange={handleEmailChange}
                onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                style={inputStyle}
              />
              {error && (
                <p style={{ fontSize: '14px', color: '#ef4444', margin: 0 }}>
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleRequestCode}
              disabled={isSendingCode}
              style={{
                ...primaryButtonStyle,
                opacity: isSendingCode ? 0.6 : 1,
                cursor: isSendingCode ? 'not-allowed' : 'pointer',
              }}
            >
              {isSendingCode ? '발송 중...' : '인증번호 받기'}
            </button>
          </div>
        )}

        {/* STEP 2: 인증번호 입력 */}
        {step === 'verify' && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: '#111827',
                    margin: 0,
                  }}
                >
                  인증번호를
                  <br />
                  입력해주세요
                </h2>
                <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                  {email} 로 보낸 6자리 인증번호를 입력해주세요.
                </p>
              </div>
              {closeButton}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="인증번호 6자리"
                  value={code}
                  onChange={handleCodeChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  style={{
                    ...inputStyle,
                    letterSpacing: '0.3em',
                    animation: isShaking ? 'shake 0.4s' : undefined,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px',
                    color: timer > 0 ? '#6b7280' : '#ef4444',
                  }}
                >
                  {timer > 0 ? formatTimer(timer) : '만료됨'}
                </span>
              </div>
              {error && (
                <p style={{ fontSize: '14px', color: '#ef4444', margin: 0 }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleRequestCode}
                disabled={isSendingCode}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'transparent',
                  color: '#6b7280',
                  fontSize: '14px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                인증번호 재발송
              </button>
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={isVerifying || timer === 0}
              style={{
                ...primaryButtonStyle,
                opacity: isVerifying || timer === 0 ? 0.6 : 1,
                cursor: isVerifying || timer === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isVerifying ? '확인 중...' : '인증 완료'}
            </button>
          </div>
        )}

        {/* STEP 3: 완료 */}
        {step === 'complete' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              ✓
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                }}
              >
                이메일 인증 완료
              </h2>
              <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
                {email} 로 인증이 완료되었어요.
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              style={primaryButtonStyle}
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
