export type RoomGoalType =
  | 'WEBAPP_MONETIZATION'
  | 'WORK_AUTOMATION'
  | 'DESIGNER_VIBECODING';

export interface BaseResponse<T> {
  statusCode: number;
  timestamp: string;
  content: T;
  message?: string;
}

export interface RetentionOnboardingRequest {
  roomGoalType: RoomGoalType;
  email: string;
  phone: string | null;
  /** Omit when the capture form did not explicitly change this channel. */
  emailMarketingConsent?: boolean;
  /** Omit when the capture form did not explicitly change this channel. */
  alerttalkConsent?: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  cohortCode: string | null;
}

export interface RetentionOnboardingResponse {
  onboardingStep: string;
  assignedCohorts: Array<{
    id: number;
    type: 'SEMINAR' | 'INTEREST';
    name: string;
  }>;
  seminarAssigned: boolean;
  emailSyncQueued: boolean;
}

export interface StreakStatus {
  streakCount: number;
  todayCompleted: boolean;
  week: Array<{ date: string; done: boolean }>;
  freezeCount: number;
  nextMilestone: 3 | 7 | 14 | null;
  milestoneReached: number[];
  atRisk: boolean;
}

export interface Cohort {
  id: number;
  type: 'SEMINAR' | 'INTEREST';
  code: string;
  name: string;
  goalLabel?: string | null;
  assignedVia: 'ONBOARDING_AUTO' | 'QR' | 'ADMIN_MANUAL' | 'FALLBACK';
}

export interface HomeFeed {
  userName: string;
  streak: Pick<StreakStatus, 'todayCompleted' | 'atRisk' | 'nextMilestone'> & {
    count: number;
  };
  continueReading: {
    articleTitle: string;
    progressPct: number;
    minutesLeft: number;
    readingPointsBalance: number;
  } | null;
  myRooms: Array<{
    id: number;
    kind: 'cohort' | 'interest';
    goalLabel: string | null;
    badge: string;
    newPostsCount: number;
    stuckQuestionsCount: number;
    memberCount: number;
  }>;
  communityToday: {
    activeRooms: Array<{
      id: number;
      goalLabel: string;
      memberCount: number;
      liveReaders: number;
      todayQuestions: number;
    }>;
    topReads: Array<{
      id: number;
      kicker: string;
      title: string;
      segmentReaderCount: number;
      faces: string[];
    }>;
  } | null;
  newMembersWeek: {
    total: number;
    byInterest: Array<{ interest: string; count: number }>;
  };
  discoveryFeed: HomeDiscoveryFeed;
}

export type HomeDiscoverySort = 'HOT' | 'NEW' | 'TOP';

export interface HomeDiscoveryFeed {
  sort: HomeDiscoverySort;
  items: Array<
    | {
        type: 'COMMUNITY_POST';
        id: string;
        roomId: number;
        title: string;
        excerpt: string;
        thumbnailUrl?: string;
        authorName?: string;
        authorAvatarUrl?: string;
        roomName?: string;
        createdAt?: string;
        stats: {
          viewCount: number;
          commentCount: number;
          helpfulCount: number;
        };
      }
    | {
        type: 'INSIGHT_ARTICLE';
        id: string;
        documentId: string;
        slug: string;
        title: string;
        excerpt: string;
        coverUrl?: string;
        categoryLabel?: string;
        stats: {
          viewCount: number;
          helpfulCount: number;
        };
      }
  >;
  nextCursor: string | null;
}

export interface PublicHomeFeed {
  topInsights: Array<{
    id: number;
    board: string;
    title: string;
    excerpt: string;
    viewCount: number;
  }>;
  activeRooms: Array<{
    id: number;
    goalLabel: string;
    memberCount: number;
    todayQuestions: number;
  }>;
  newMembersWeek: {
    total: number;
    byInterest: Array<{ interest: string; count: number }>;
  };
  hotQuestions: Array<{
    id: number;
    title: string;
    excerpt: string;
    answerCount: number;
  }>;
}

export interface InsightReadingBudget {
  balance: number;
  dailyCap: number;
  nextRechargeAt: string;
  pointsArePrivate: boolean;
}

export interface InsightArticleUnlock {
  unlocked: boolean;
  balanceAfter: number;
  cost: number;
}
