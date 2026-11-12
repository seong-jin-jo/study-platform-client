import type { Metadata } from 'next';
import {
  formatReleaseNoteHeading,
  getRecentReleaseNotes,
} from '@/features/whats-new/model/release-notes';

// Next.js App Router가 페이지 파일의 named export로 metadata를 요구한다.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: '업데이트 소식 | ZERO ONE IT',
  description:
    'ZERO ONE IT 가 어떻게 고쳐지고 있는지 버전별로 확인하세요. 최근 업데이트 3건을 보여 드립니다.',
  alternates: {
    canonical: 'https://www.zeroone.it.kr/updates',
  },
};

export default function UpdatesPage() {
  const notes = getRecentReleaseNotes();

  return (
    <section className="min-h-full bg-background-alternative">
      <div className="mx-auto flex w-full max-w-7600 flex-col gap-400 px-300 py-600 sm:px-600 sm:py-1000">
        <header>
          <p className="font-designer-16b text-text-brand-strong">
            ZERO-ONE 운영
          </p>
          <h1 className="mt-100 font-designer-24b text-text-strong">
            업데이트 소식
          </h1>
          <p className="mt-200 break-keep font-designer-16r leading-relaxed text-text-subtle">
            서비스가 어떻게 고쳐지고 있는지 버전별로 적어 둡니다.
          </p>
        </header>

        <ol className="flex flex-col gap-200" data-testid="updates-list">
          {notes.map((note) => (
            <li
              key={note.version}
              data-testid="updates-item"
              className="rounded-200 border border-border-subtle bg-background-default p-300 sm:p-400"
            >
              <h2 className="break-keep font-designer-16b text-text-strong">
                {formatReleaseNoteHeading(note)}
              </h2>
              <div className="mt-150 flex flex-col gap-100">
                {note.body.slice(0, 3).map((line) => (
                  <p
                    key={line}
                    className="break-keep font-designer-16r leading-relaxed text-text-subtle"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
