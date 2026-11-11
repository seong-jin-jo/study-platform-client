import type { Metadata } from 'next';

const ACCOUNT_DELETION_EMAIL = 'code0to1@gmail.com';
const ACCOUNT_DELETION_EMAIL_HREF =
  'mailto:code0to1@gmail.com?subject=%EB%B0%94%EC%9D%B4%EB%B8%8C%EB%A7%81%EA%B3%A0%20%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD';
const PRIVACY_POLICY_URL =
  'https://gaan.notion.site/389fbb391d798087a519cda1255fdfc1';

// Next.js App Router가 페이지 파일의 named export로 metadata를 요구한다.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: '계정 삭제 안내 | 바이브링고',
  description:
    '바이브링고 앱 또는 웹에서 계정과 연결된 개인정보 삭제를 요청하는 방법을 안내합니다.',
  alternates: {
    canonical: 'https://www.zeroone.it.kr/account/delete',
  },
  robots: {
    index: false,
    follow: false,
  },
};

const RETENTION_ITEMS = [
  {
    data: '계약 또는 청약철회 등에 관한 기록',
    period: '5년',
  },
  {
    data: '대금 결제 및 재화 등의 공급에 관한 기록',
    period: '5년',
  },
  {
    data: '소비자 불만 또는 분쟁 처리에 관한 기록',
    period: '3년',
  },
  {
    data: '서비스 접속·요청 처리 기록',
    period: '1년',
  },
] as const;

export default function AccountDeletionPage() {
  return (
    <section className="min-h-full bg-background-alternative">
      <div className="mx-auto flex w-full max-w-7600 flex-col gap-400 px-300 py-600 sm:px-600 sm:py-1000">
        <header>
          <p className="font-designer-16b text-text-brand-strong">
            ZERO-ONE 운영
          </p>
          <h1 className="mt-100 font-designer-24b text-text-strong">
            바이브링고 계정 삭제 안내
          </h1>
          <p className="mt-200 break-keep font-designer-16r leading-relaxed text-text-subtle">
            앱을 이용할 수 없는 경우에도 아래 웹 요청 방법으로 계정과 연결된
            개인정보 삭제를 요청할 수 있습니다.
          </p>
        </header>

        <section className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400">
          <h2 className="font-designer-20b text-text-strong">삭제 요청 방법</h2>
          <ol className="mt-250 flex flex-col gap-300">
            <li>
              <p className="font-designer-16b text-text-default">
                1. 앱에서 직접 삭제
              </p>
              <p className="mt-100 break-keep font-designer-16r leading-relaxed text-text-subtle">
                바이브링고 앱 오른쪽 위 ≡ 버튼 &gt; 계정 삭제로 이동해 안내에 따라
                삭제합니다.
              </p>
            </li>
            <li className="border-t border-border-subtle pt-300">
              <p className="font-designer-16b text-text-default">
                2. 웹에서 이메일로 요청
              </p>
              <p className="mt-100 break-keep font-designer-16r leading-relaxed text-text-subtle">
                개인정보처리방침에 기재된 개인정보 보호책임자 이메일로 가입
                이메일과 함께 계정 삭제를 요청합니다.
              </p>
              <a
                href={ACCOUNT_DELETION_EMAIL_HREF}
                className="mt-200 inline-flex min-h-550 items-center rounded-150 bg-background-brand-default px-250 font-designer-16b text-text-inverse transition-transform active:scale-95"
              >
                {ACCOUNT_DELETION_EMAIL}로 요청하기
              </a>
            </li>
          </ol>
        </section>

        <section className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400">
          <h2 className="font-designer-20b text-text-strong">
            삭제되는 데이터
          </h2>
          <p className="mt-200 break-keep font-designer-16r leading-relaxed text-text-subtle">
            법령에 따라 보관해야 하는 기록을 제외하고, 이름·휴대폰번호·이메일·
            소셜 계정 식별자와 프로필 닉네임·이미지 등 계정에 연결된 개인정보를
            파기합니다. 서비스 개선·통계 분석 목적의 정보는 비식별 처리 후
            활용될 수 있습니다.
          </p>
        </section>

        <section className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400">
          <h2 className="font-designer-20b text-text-strong">
            법령에 따라 보관되는 데이터
          </h2>
          <dl className="mt-250 divide-y divide-border-subtle border-y border-border-subtle">
            {RETENTION_ITEMS.map((item) => (
              <div
                key={item.data}
                className="flex flex-col gap-75 py-200 sm:flex-row sm:items-center sm:justify-between sm:gap-300"
              >
                <dt className="break-keep font-designer-16r leading-relaxed text-text-default">
                  {item.data}
                </dt>
                <dd className="shrink-0 font-designer-16b text-text-brand-strong">
                  {item.period}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-200 break-keep font-designer-16r leading-relaxed text-text-subtle">
            보관 기간이 끝나면 해당 기록은 지체 없이 파기합니다.
          </p>
        </section>

        <section className="rounded-200 border border-border-brand bg-background-accent-rose-subtle p-300 sm:p-400">
          <h2 className="font-designer-20b text-text-strong">처리 기한</h2>
          <p className="mt-200 break-keep font-designer-16r leading-relaxed text-text-default">
            보관 의무가 없는 개인정보는 탈퇴 요청 또는 처리 목적 달성 시 지체
            없이 파기합니다. 요청을 받은 날부터 10일 이내에 처리 결과를
            회신합니다.
          </p>
        </section>

        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-550 items-center justify-center rounded-150 border border-border-default bg-background-default px-250 text-center font-designer-16b text-text-default transition-colors hover:bg-background-neutral-subtle active:bg-background-neutral-subtle"
        >
          개인정보처리방침 원문 보기
        </a>
      </div>
    </section>
  );
}
