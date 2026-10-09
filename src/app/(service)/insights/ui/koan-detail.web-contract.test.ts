import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(
  new URL('./koan-detail.tsx', import.meta.url),
  'utf8',
);

describe('화두 상세 웹 동작 보존 계약', () => {
  it('AIT-M1-01 웹 작성 진입은 기존 해시 앵커와 CSS 선택자를 유지한다', () => {
    expect(source.match(/href="#koan-composer"/g)).toHaveLength(2);
    expect(source).not.toContain('scrollIntoView');
  });

  it('AIT-M1-02 읽기 전용 앱에서는 작성 UI 전체를 렌더하지 않는다', () => {
    expect(source).toContain('{!readOnly ? (');
    expect(source).toContain('className={styles.detailMobileBar}');
    expect(source).toContain('className={styles.railCard}');
  });

  it('AIT-M4-03 읽기 전용 앱에서는 미지원 개념섬 링크를 숨긴다', () => {
    expect(
      source.match(/href={`\/insights\/land\/\$\{koan\.categorySlug\}`}/g),
    ).toHaveLength(2);
    expect(source.match(/!readOnly \? \(/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
