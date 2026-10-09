export interface InsightSocialProof {
  viewCount: number;
  helpfulCount: number;
  explorerCount: number;
  helpfulByMe: boolean;
}
export type InsightNodeState = 'READ' | 'NEXT' | 'UNLOCKED' | 'LOCKED' | null;
export interface InsightMapArticle {
  documentId: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  unlockCost: number;
  accessLevel?: 'FREE' | 'UNLOCKED' | 'LOCKED';
  required: boolean;
  state: InsightNodeState;
  socialProof: InsightSocialProof;
}
export interface InsightIsland {
  islandId: number;
  slug: string;
  name: string;
  presentationTier?: 'OCEAN' | 'NEW';
  firstFreeDocumentId?: string | null;
  bridgeRoomId: number | null;
  bridgeRoomName?: string | null;
  progress: {
    read: number;
    total: number;
    conquered: boolean;
    conqueredAt: string | null;
  } | null;
  explorerCount: number;
  articles: InsightMapArticle[];
}
export interface InsightMap {
  islands: InsightIsland[];
  readingBudget: { balance: number; dailyCap: number } | null;
}
export interface InsightProgressResult {
  documentId: string;
  state: 'READ';
  island: {
    islandId: number;
    read: number;
    total: number;
    conqueredNow: boolean;
    conqueredAt: string | null;
  };
}
export interface InsightHelpfulResult {
  documentId: string;
  helpful: boolean;
  helpfulCount: number;
}
