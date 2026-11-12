import releaseNotesJson from '@/content/release-notes.json';

/**
 * 공개 업데이트 기록 한 항목. RELEASE.md 의 `public_note:` 블록과 같은 모양이다.
 * 원천은 RELEASE.md 이고, src/content/release-notes.json 은
 * scripts/sync-release-notes.mjs 가 만든다. 문구는 이 화면에서 만들지 않는다.
 */
export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  body: string[];
  notify: boolean;
  try_href?: string;
}

/** /updates 에 보이는 최근 항목 수 */
export const UPDATES_PAGE_LIMIT = 3;

/** 버전 문자열 형식. 쿼리·이벤트로 흘러가기 전 검증에 쓴다. */
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const isValidVersion = (value: unknown): value is string =>
  typeof value === 'string' && VERSION_PATTERN.test(value);

const compareVersionDesc = (a: string, b: string): number => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/** 최신 버전이 앞에 오도록 정렬한다. 입력은 바꾸지 않는다. */
export const sortReleaseNotes = (
  notes: readonly ReleaseNote[],
): ReleaseNote[] =>
  [...notes]
    .filter((note) => isValidVersion(note.version))
    .sort((a, b) => compareVersionDesc(a.version, b.version));

export const getRecentReleaseNotes = (
  notes: readonly ReleaseNote[] = releaseNotesJson as ReleaseNote[],
  limit: number = UPDATES_PAGE_LIMIT,
): ReleaseNote[] => sortReleaseNotes(notes).slice(0, limit);

export const getLatestReleaseNote = (
  notes: readonly ReleaseNote[] = releaseNotesJson as ReleaseNote[],
): ReleaseNote | undefined => sortReleaseNotes(notes)[0];

/** 머리줄 `<버전> · <날짜> · <제목>` */
export const formatReleaseNoteHeading = (note: ReleaseNote): string =>
  `${note.version} · ${note.date} · ${note.title}`;
