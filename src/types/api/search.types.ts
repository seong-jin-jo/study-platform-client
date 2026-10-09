export type UnifiedSearchResourceType = 'COMMUNITY_POST' | 'INSIGHT_ARTICLE';

export interface UnifiedSearchItem {
  type: UnifiedSearchResourceType;
  resourceKey: string;
  title: string;
  previewText: string;
  access: 'FULL' | 'PREVIEW';
  destination: string;
  publishedAt: string;
}

export interface UnifiedSearchResponse {
  items: UnifiedSearchItem[];
  nextCursor: string | null;
  partial: boolean;
  unavailableSources: string[];
}
