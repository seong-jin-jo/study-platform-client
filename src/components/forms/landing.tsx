'use client';

import Image from 'next/image';
import LoginModal from '@/components/auth/modals/login-modal';
import Button from '@/components/common/ui/button';

export default function Landing({ callbackPath }: { callbackPath?: string }) {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-400 px-200 pt-750 md:flex-row md:gap-750 md:px-0 md:pt-1250">
      <section className="flex w-full md:w-[378px] flex-col items-start gap-300 md:gap-750">
        <h1 className="font-pretendard font-designer-32b w-full text-[#333436] md:text-[52px] md:leading-[78px]">
          ZERO - ONE
        </h1>
        <p className="text-16 w-full font-medium text-[#535862] md:text-24">
          ZERO-ONE에 오신 것을 환영합니다! <br />
          개발자 면접 준비, 이제 ZERO-ONE에서 <br />
          매주 실전처럼 연습해보세요.
        </p>

        <LoginModal
          callbackPath={callbackPath}
          openTrigger={
            <Button
              color="primary"
              size="large"
              className="w-full md:w-[234px]"
            >
              시작하기
            </Button>
          }
        />
      </section>
      {/* 390 폭에서는 그래픽을 숨겨 1열로 배치한다(좌측 잘림 회귀 수정). */}
      <section className="hidden aspect-[349.44/524.16] h-[524.16px] w-[349.44px] flex-shrink-0 bg-cover bg-center bg-no-repeat md:block">
        <Image
          src="graphic-area.svg"
          alt="Graphic Area"
          width={345}
          height={348}
        />
      </section>
    </main>
  );
}
