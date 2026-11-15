import { describe, expect, it } from 'vitest';

import { formatIslandMapLabel } from '@/components/insights/insight-island-map-label';

const article = { documentId: 'a' } as never;

describe('formatIslandMapLabel', () => {
  it('글이 없는 섬은 회원·비회원 모두 미개척이다', () => {
    expect(
      formatIslandMapLabel({ articles: [], progress: null } as never, false),
    ).toBe('미개척');
    expect(
      formatIslandMapLabel({ articles: [], progress: null } as never, true),
    ).toBe('미개척');
  });

  it('비회원은 편 수만, 회원은 읽은 편 수까지 본다', () => {
    const island = {
      articles: [article, article, article],
      progress: { read: 1 },
    } as never;
    expect(formatIslandMapLabel(island, false)).toBe('개념글 3편');
    expect(formatIslandMapLabel(island, true)).toBe('3편 중 1편 열림');
  });
});
