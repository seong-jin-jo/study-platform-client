export const COMPLETED_ARTICLES_STORAGE_KEY =
  'zero-one.insights.completed-articles';
export const UNLOCKED_ARTICLES_STORAGE_KEY =
  'zero-one.insights.unlocked-articles';

type ArticleStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type InsightLearningNodeStatus =
  | 'done'
  | 'unlocked'
  | 'next'
  | 'locked'
  | 'soon';

export const readInsightArticleSlugs = (
  storage: ArticleStorage,
  key: string,
) => {
  const stored = storage.getItem(key);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
};

export const appendInsightArticleSlug = (
  storage: ArticleStorage,
  key: string,
  current: string[],
  slug: string,
) => {
  const next = current.includes(slug) ? current : [...current, slug];
  storage.setItem(key, JSON.stringify(next));
  return next;
};

export const resolveInsightLearningNodeStatus = ({
  hasArticle,
  isCompleted,
  isUnlocked,
  isFirstIncomplete,
}: {
  hasArticle: boolean;
  isCompleted: boolean;
  isUnlocked: boolean;
  isFirstIncomplete: boolean;
}): InsightLearningNodeStatus => {
  if (!hasArticle) return 'soon';
  if (isCompleted) return 'done';
  if (isUnlocked) return 'unlocked';
  if (isFirstIncomplete) return 'next';
  return 'locked';
};
