import { describe, expect, it } from 'vitest';
import releaseNotesJson from '@/content/release-notes.json';
import {
  formatReleaseNoteHeading,
  getLatestReleaseNote,
  getRecentReleaseNotes,
  isValidVersion,
  type ReleaseNote,
  sortReleaseNotes,
} from './release-notes';

const note = (version: string, overrides: Partial<ReleaseNote> = {}) => ({
  version,
  date: '2026-11-12',
  title: `제목 ${version}`,
  body: ['본문 한 줄'],
  notify: false,
  ...overrides,
});

describe('공개 업데이트 기록 모델', () => {
  it('WHATS-NEW-001 최신 버전부터 정렬한다(0.10.9 < 0.10.12)', () => {
    const sorted = sortReleaseNotes([
      note('0.10.9'),
      note('0.10.12'),
      note('0.9.4'),
      note('0.10.11'),
    ]);
    expect(sorted.map((n) => n.version)).toEqual([
      '0.10.12',
      '0.10.11',
      '0.10.9',
      '0.9.4',
    ]);
  });

  it('WHATS-NEW-002 최근 3개만 돌려주고 형식이 틀린 버전은 거른다', () => {
    const recent = getRecentReleaseNotes(
      [
        note('0.10.9'),
        note('0.10.10'),
        note('0.10.11'),
        note('0.10.12'),
        note('not-a-version'),
      ],
      3,
    );
    expect(recent.map((n) => n.version)).toEqual([
      '0.10.12',
      '0.10.11',
      '0.10.10',
    ]);
  });

  it('WHATS-NEW-003 머리줄은 `버전 · 날짜 · 제목` 형식이다', () => {
    expect(formatReleaseNoteHeading(note('0.10.12'))).toBe(
      '0.10.12 · 2026-11-12 · 제목 0.10.12',
    );
  });

  it('WHATS-NEW-004 빈 목록이면 최신 항목이 없다', () => {
    expect(getLatestReleaseNote([])).toBeUndefined();
  });

  it('WHATS-NEW-005 버전 문자열 검증은 숫자.숫자.숫자만 통과시킨다', () => {
    expect(isValidVersion('0.10.12')).toBe(true);
    expect(isValidVersion('0.10')).toBe(false);
    expect(isValidVersion('1.0.0<script>')).toBe(false);
    expect(isValidVersion(undefined)).toBe(false);
  });

  it('WHATS-NEW-006 저장소의 release-notes.json 은 계약 필드를 모두 갖고 본문이 1~3줄이다', () => {
    const notes = releaseNotesJson as ReleaseNote[];
    expect(notes.length).toBeGreaterThanOrEqual(3);
    for (const entry of notes) {
      expect(isValidVersion(entry.version)).toBe(true);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(typeof entry.notify).toBe('boolean');
      expect(entry.body.length).toBeGreaterThanOrEqual(1);
      expect(entry.body.length).toBeLessThanOrEqual(3);
    }
  });
});
