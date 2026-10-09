'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import {
  useSendPhoneVerificationCodeMutation,
  useVerifyPhoneCodeMutation,
} from '@/hooks/queries/auth/use-phone-auth-mutation';
import { usePhoneVerificationStatus } from '@/hooks/queries/use-phone-verification-status';
import { extractErrorCode } from '@/utils/error';
import { formatPhoneNumber } from '@/utils/format';

type VerificationStage = 'contact' | 'code';

interface Step0PhoneVerificationProps {
  defaultRealName: string;
  memberId?: number;
  onNext: () => void;
}

const VERIFICATION_CODE_TTL_SECONDS = 180;
const REAL_NAME_PATTERN = /^[가-힣a-zA-Z\s]{2,20}$/;
const PHONE_NUMBER_PATTERN = /^01[0-9]{8,9}$/;

const sanitizeDefaultRealName = (name: string): string => {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (normalized === '회원') return '';

  return REAL_NAME_PATTERN.test(normalized) ? normalized : '';
};

export function Step0PhoneVerification({
  defaultRealName,
  memberId,
  onNext,
}: Step0PhoneVerificationProps) {
  const [stage, setStage] = useState<VerificationStage>('contact');
  const [realName, setRealName] = useState(() =>
    sanitizeDefaultRealName(defaultRealName),
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timer, setTimer] = useState(VERIFICATION_CODE_TTL_SECONDS);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const {
    isVerified,
    isLoading: isVerificationLoading,
    setVerified,
  } = usePhoneVerificationStatus(memberId);
  const { mutate: sendCode, isPending: isSendingCode } =
    useSendPhoneVerificationCodeMutation();
  const { mutate: verifyCode, isPending: isVerifyingCode } =
    useVerifyPhoneCodeMutation(memberId);

  const isValidRealName = REAL_NAME_PATTERN.test(realName.trim());
  const isValidPhoneNumber = PHONE_NUMBER_PATTERN.test(phoneNumber);
  const canRequestCode =
    isValidRealName && isValidPhoneNumber && !isSendingCode;
  const canVerifyCode =
    verificationCode.length === 6 && timer > 0 && !isVerifyingCode;

  useEffect(() => {
    const input =
      stage === 'contact' ? nameInputRef.current : codeInputRef.current;
    input?.focus();
  }, [stage]);

  useEffect(() => {
    if (isVerificationLoading || !isVerified) {
      return;
    }

    onNext();
  }, [isVerificationLoading, isVerified, onNext]);

  useEffect(() => {
    if (stage !== 'code' || timer <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimer((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [stage, timer]);

  const handleRealNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRealName(event.target.value.slice(0, 20));
    setError('');
  };

  const handlePhoneNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextPhoneNumber = event.target.value
      .replace(/[^0-9]/g, '')
      .slice(0, 11);

    setPhoneNumber(nextPhoneNumber);
    setError('');
  };

  const handleVerificationCodeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextCode = event.target.value.replace(/[^0-9]/g, '').slice(0, 6);

    setVerificationCode(nextCode);
    setError('');
  };

  const requestCode = () => {
    if (!isValidRealName) {
      setError('이름을 2~20자 한글 또는 영문으로 입력해주세요.');

      return;
    }

    if (!isValidPhoneNumber) {
      setError('휴대폰 번호를 010으로 시작하는 숫자로 입력해주세요.');

      return;
    }

    sendCode(
      {
        realName: realName.trim(),
        phoneNumber,
      },
      {
        onSuccess: () => {
          setStage('code');
          setVerificationCode('');
          setTimer(VERIFICATION_CODE_TTL_SECONDS);
          setError('');
        },
        onError: (sendError: unknown) => {
          const { message } = extractErrorCode(sendError);
          setError(
            message || '인증번호 발송에 실패했습니다. 다시 시도해주세요.',
          );
        },
      },
    );
  };

  const verify = () => {
    if (!canVerifyCode) {
      setError('인증번호 6자리를 입력해주세요.');

      return;
    }

    verifyCode(
      {
        realName: realName.trim(),
        phoneNumber,
        code: verificationCode,
      },
      {
        onSuccess: (data) => {
          if (data?.success) {
            setVerified(phoneNumber);
            onNext();

            return;
          }

          setVerificationCode('');
          setError(data?.message || '인증번호가 올바르지 않습니다.');
        },
        onError: (verifyError: unknown) => {
          const { message } = extractErrorCode(verifyError);
          setVerificationCode('');
          setError(message || '인증번호 확인에 실패했습니다.');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-400 py-200">
      <div className="flex flex-col items-center gap-200 text-center">
        <div className="flex size-1500 items-center justify-center rounded-full bg-rose-50">
          <ShieldCheck className="size-650 text-rose-500" />
        </div>
        <div className="flex flex-col gap-100">
          <p className="font-designer-20b text-gray-800">
            휴대폰 번호를 인증해주세요
          </p>
          <p className="whitespace-pre-line font-designer-14r text-gray-500">
            {
              '소셜 계정에서 전화번호를 받지 못했어요.\n가입을 계속하려면 먼저 본인인증이 필요해요.'
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-250">
        <input
          ref={nameInputRef}
          type="text"
          value={realName}
          onChange={handleRealNameChange}
          placeholder="이름"
          autoComplete="name"
          className={cn(
            'h-700 rounded-150 border px-250 font-designer-16r text-gray-800 outline-none placeholder:text-gray-400 transition-colors',
            error && !isValidRealName
              ? 'border-border-error'
              : 'border-gray-300 focus:border-border-brand',
          )}
        />
        <input
          type="tel"
          inputMode="numeric"
          value={formatPhoneNumber(phoneNumber)}
          onChange={handlePhoneNumberChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canRequestCode) requestCode();
          }}
          placeholder="010-1234-5678"
          autoComplete="tel"
          maxLength={13}
          className={cn(
            'h-700 rounded-150 border px-250 font-designer-16r text-gray-800 outline-none placeholder:text-gray-400 transition-colors',
            error && !isValidPhoneNumber
              ? 'border-border-error'
              : 'border-gray-300 focus:border-border-brand',
          )}
        />

        {stage === 'code' && (
          <div className="flex flex-col gap-150">
            <div className="relative">
              <input
                ref={codeInputRef}
                type="tel"
                inputMode="numeric"
                value={verificationCode}
                onChange={handleVerificationCodeChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canVerifyCode) verify();
                }}
                placeholder="인증번호 6자리"
                maxLength={6}
                className={cn(
                  'h-700 w-full rounded-150 border px-250 pr-1000 font-designer-16r text-gray-800 outline-none placeholder:text-gray-400 transition-colors',
                  error
                    ? 'border-border-error bg-red-50'
                    : 'border-gray-300 focus:border-border-brand',
                )}
              />
              <span className="absolute top-1/2 right-250 -translate-y-1/2 font-designer-14m text-text-error">
                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
              </span>
            </div>
            <Button
              type="button"
              color="secondary"
              size="xsmall"
              onClick={requestCode}
              disabled={isSendingCode}
              className="h-auto self-end bg-transparent p-0 font-designer-14m text-gray-500 underline underline-offset-2 transition-colors hover:bg-transparent hover:text-gray-700 active:bg-transparent disabled:cursor-wait disabled:bg-transparent disabled:text-gray-300"
            >
              {isSendingCode ? '전송 중...' : '인증번호 재전송'}
            </Button>
          </div>
        )}

        <p
          aria-live="polite"
          className={cn(
            'min-h-250 font-designer-13r',
            error ? 'text-text-error' : 'text-text-subtlest',
          )}
        >
          {error ||
            (stage === 'code'
              ? `${formatPhoneNumber(phoneNumber)}로 받은 인증번호를 입력해주세요.`
              : '이름과 휴대폰 번호는 본인인증에만 사용됩니다.')}
        </p>
      </div>

      <Button
        type="button"
        color="primary"
        size="large"
        aria-busy={isSendingCode || isVerifyingCode}
        onClick={stage === 'contact' ? requestCode : verify}
        disabled={stage === 'contact' ? !canRequestCode : !canVerifyCode}
        className="h-700 w-full disabled:bg-gray-200 disabled:text-gray-400"
      >
        {isSendingCode || isVerifyingCode ? (
          <Loader2 className="size-300 animate-spin" />
        ) : stage === 'contact' ? (
          '인증번호 받기'
        ) : (
          '인증 완료하기'
        )}
      </Button>
    </div>
  );
}
