import type { Metadata } from 'next';
import {
  extractNotice,
  extractPolicyBody,
  PRIVACY_POLICY_V03_URL,
  PRIVACY_POLICY_V1_ANCHOR,
  readPrivacyPolicySource,
  renderMarkdown,
} from '@/features/privacy/model/privacy-policy';

// Next.js App Router가 페이지 파일의 named export로 metadata를 요구한다.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: '개인정보처리방침 | ZERO ONE IT',
  description:
    '정성컴퍼니(제로원·바이브링고)의 개인정보처리방침입니다. 2026-12-13 시행 개정안(v1.0)과 현재 시행 중인 방침(v0.3) 안내, 개정 이력을 확인하세요.',
  alternates: {
    canonical: 'https://www.zeroone.it.kr/privacy',
  },
};

// 본문 마크다운(표·목록·강조)의 모양. 색·간격은 프로젝트 토큰만 쓴다.
const PROSE_CLASS = [
  'break-keep font-designer-16r leading-relaxed text-text-default',
  '[&_h3]:mt-500 [&_h3]:mb-150 [&_h3]:font-designer-20b [&_h3]:text-text-strong',
  '[&_h4]:mt-300 [&_h4]:mb-100 [&_h4]:font-designer-16b [&_h4]:text-text-strong',
  '[&_p]:mt-150 [&_ul]:mt-150 [&_ul]:list-disc [&_ul]:pl-300 [&_ol]:mt-150 [&_ol]:list-decimal [&_ol]:pl-300',
  '[&_li]:mt-50 [&_strong]:font-designer-16b [&_a]:text-text-brand [&_a]:underline',
  '[&_blockquote]:mt-150 [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-200 [&_blockquote]:text-text-subtle',
  '[&_table]:mt-200 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border-subtle [&_th]:bg-background-alternative [&_th]:p-100 [&_th]:text-left [&_th]:font-designer-14b [&_th]:whitespace-nowrap',
  '[&_td]:border [&_td]:border-border-subtle [&_td]:p-100 [&_td]:align-top [&_td]:font-designer-14r',
].join(' ');

const REVISIONS = [
  {
    version: 'v1.0',
    date: '시행 2026-12-13 (공지 2026-11-13)',
    note: '새 방침. 광고 도구와 호스팅사 추가, 수탁사 정리 등',
  },
  {
    version: 'v0.3',
    date: '시행 2026-06-25 (2026-12-12까지 적용)',
    note: '현재 시행 중인 방침',
  },
] as const;

export default function PrivacyPolicyPage() {
  const source = readPrivacyPolicySource();
  const noticeHtml = renderMarkdown(extractNotice(source));
  const bodyHtml = renderMarkdown(extractPolicyBody(source));

  return (
    <section className="min-h-full bg-background-alternative">
      <div className="mx-auto flex w-full max-w-7600 flex-col gap-400 px-300 py-600 sm:px-600 sm:py-1000">
        <header>
          <p className="font-designer-16b text-text-brand-strong">
            ZERO-ONE 운영
          </p>
          <h1 className="mt-100 font-designer-24b text-text-strong">
            개인정보처리방침
          </h1>
        </header>

        {/* ① 개정 공지 */}
        <aside
          aria-label="개인정보처리방침 개정 안내"
          data-testid="privacy-notice"
          className="rounded-200 border border-border-brand bg-background-default p-300 sm:p-400"
        >
          <div
            className={PROSE_CLASS}
            // 저장소 안 승인 원문만 렌더한다(사용자 입력 아님).
             
            dangerouslySetInnerHTML={{ __html: noticeHtml }}
          />
        </aside>

        {/* ② 현재 시행 중인 방침 */}
        <section
          data-testid="privacy-current"
          className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400"
        >
          <h2 className="font-designer-20b text-text-strong">
            지금 적용되는 방침
          </h2>
          <p className="mt-150 break-keep font-designer-16r leading-relaxed text-text-default">
            2026-12-12 까지는 현행 방침(v0.3)이 적용됩니다. 아래 v1.0 은
            2026-12-13 부터 적용됩니다.
          </p>
          <p className="mt-150 font-designer-16r">
            <a
              href={PRIVACY_POLICY_V03_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-550 items-center text-text-brand underline underline-offset-2"
            >
              현행 방침 v0.3 보기 (Notion)
            </a>
          </p>
        </section>

        {/* ③ v1.0 전문 */}
        <section
          id={PRIVACY_POLICY_V1_ANCHOR}
          data-testid="privacy-body"
          className="scroll-mt-400 rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400"
        >
          <h2 className="font-designer-20b text-text-strong">
            개인정보처리방침 v1.0 (2026-12-13 시행)
          </h2>
          <div
            className={PROSE_CLASS}
            // 저장소 안 승인 원문만 렌더한다(사용자 입력 아님).
             
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </section>

        {/* ④ 개정 이력 */}
        <section
          data-testid="privacy-history"
          className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400"
        >
          <h2 className="font-designer-20b text-text-strong">개정 이력</h2>
          <ul className="mt-150 flex flex-col gap-100">
            {REVISIONS.map((revision) => (
              <li
                key={revision.version}
                className="break-keep font-designer-16r text-text-default"
              >
                <span className="font-designer-16b text-text-strong">
                  {revision.version}
                </span>{' '}
                · {revision.date} · {revision.note}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
