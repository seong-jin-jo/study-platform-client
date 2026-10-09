export type CommunityRoomAxis = 'JOB' | 'GOAL' | 'LEVEL';

export interface CommunityRoomAxisTag {
  code: string;
  label: string;
  axis?: CommunityRoomAxis;
}

export interface CommunityRoomRule {
  order: number;
  body: string;
}

export interface CommunityRoomAdmissionQuestion {
  order: number;
  body: string;
}

export interface CommunityRoomMember {
  publicProfileUuid: string;
  nickname: string;
  profileImageUrl?: string | null;
  joinedAt: string;
  newcomer: boolean;
}

export interface CommunityRoomOwnership {
  state: 'ACTIVE' | 'VACANT';
  ownerPublicProfileUuid?: string | null;
  claimable: boolean;
  revision: number;
}

export interface CommunityRoomSummary {
  roomId: number;
  cohortId?: number | null;
  slug: string;
  code: string;
  name: string;
  description: string;
  bannerUrl?: string | null;
  axisTags: CommunityRoomAxisTag[];
  jobAxis: CommunityRoomAxisTag[];
  goalAxis: CommunityRoomAxisTag[];
  levelAxis: CommunityRoomAxisTag[];
  stats: {
    memberCount: number;
    postCount7d: number;
    commentCount7d: number;
  };
  memberCount: number;
  newPostsToday: number;
  liveSignal: boolean;
  membership: {
    state: 'ACTIVE' | 'NONE';
    canJoin: boolean;
  };
  ownership?: CommunityRoomOwnership;
  admissionQuestions?: CommunityRoomAdmissionQuestion[];
  members?: {
    items: CommunityRoomMember[];
    nextCursor?: string | null;
  };
  activity?: {
    posts7d: number;
    comments7d: number;
    helpful7d: number;
    activeMembers7d: number;
  };
  quietState?: {
    quiet: boolean;
    reason?: string | null;
  };
  rules: CommunityRoomRule[];
  revision: number;
}

export interface CommunityRoomHubResponse {
  myRooms: CommunityRoomSummary[];
  exploreRooms: CommunityRoomSummary[];
  axes: {
    job: CommunityRoomAxisTag[];
    goal: CommunityRoomAxisTag[];
    level: CommunityRoomAxisTag[];
  };
  activeRoomCount: number;
  activeRoomLimit: number;
}

export interface CommunityRoomHubFilters {
  job?: string;
  goal?: string;
  level?: string;
}

export interface JoinCommunityRoomRequest {
  roomId: number;
  introduction: string;
  leaveRoomId?: number;
  expectedMembershipRevision?: number;
}

export interface CommunityRoomMembershipResponse {
  joined: boolean;
  joinedRoomId?: number | null;
  leftRoomId?: number | null;
  memberCount: number;
  activeRoomCount: number;
  membershipRevision: number;
  activeRooms: Array<{ roomId: number; name: string }>;
}

export interface CreateCommunityRoomRequest {
  name: string;
  description: string;
  bannerAssetKey: string;
  axisTags: string[];
  rules: CommunityRoomRule[];
  ownerIntroduction: string;
  firstPost: {
    title: string;
    contentHtml: string;
    excerpt?: string;
  };
}

export interface CreateCommunityRoomResponse {
  roomId: number;
  slug: string;
  membership: {
    role: 'OWNER';
    status: 'ACTIVE';
    joinedAt: string;
  };
  firstPostId: number;
  activeRoomCount: number;
  revision: number;
}

export interface CommunityRoomBannerUploadTicket {
  uploadUrl: string;
  publicUrl: string;
  uploadMethod: string;
  uploadFieldName: string;
  expiresAt: string;
}

export interface CommunityRoomOwnershipClaimResponse {
  roomId: number;
  ownership: {
    state: 'ACTIVE';
    ownerPublicProfileUuid: string;
    revision: number;
  };
  systemPostId: number;
}
