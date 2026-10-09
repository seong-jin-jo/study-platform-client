import type { InsightIsland } from '@/types/insight-worldmap';

export const getReadOnlyIslandArticleHref = (island: InsightIsland) => {
  const publicArticle = island.articles.find(
    (article) => article.accessLevel === 'FREE',
  );

  return publicArticle
    ? `/insights/read?slug=${encodeURIComponent(publicArticle.slug)}`
    : null;
};
