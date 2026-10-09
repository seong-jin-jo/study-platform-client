import { describe, expect, it } from 'vitest';
import {
  appendInsightArticleSlug,
  readInsightArticleSlugs,
  resolveInsightLearningNodeStatus,
  UNLOCKED_ARTICLES_STORAGE_KEY,
} from './insight-learning-progress';

const createStorage = (initialValue?: string) => {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(UNLOCKED_ARTICLES_STORAGE_KEY, initialValue);
  }

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('insight-learning-progress', () => {
  it('persists an unlocked article without duplicating the slug', () => {
    const storage = createStorage();
    const first = appendInsightArticleSlug(
      storage,
      UNLOCKED_ARTICLES_STORAGE_KEY,
      [],
      'locked-article',
    );
    const second = appendInsightArticleSlug(
      storage,
      UNLOCKED_ARTICLES_STORAGE_KEY,
      first,
      'locked-article',
    );

    expect(second).toEqual(['locked-article']);
    expect(
      readInsightArticleSlugs(storage, UNLOCKED_ARTICLES_STORAGE_KEY),
    ).toEqual(['locked-article']);
  });

  it('falls back safely when stored progress is malformed', () => {
    expect(
      readInsightArticleSlugs(
        createStorage('{broken'),
        UNLOCKED_ARTICLES_STORAGE_KEY,
      ),
    ).toEqual([]);
  });

  it('makes an unlocked article readable before sequence locking', () => {
    expect(
      resolveInsightLearningNodeStatus({
        hasArticle: true,
        isCompleted: false,
        isUnlocked: true,
        isFirstIncomplete: false,
      }),
    ).toBe('unlocked');
  });

  it('keeps completion as the highest-priority state', () => {
    expect(
      resolveInsightLearningNodeStatus({
        hasArticle: true,
        isCompleted: true,
        isUnlocked: true,
        isFirstIncomplete: true,
      }),
    ).toBe('done');
  });
});
