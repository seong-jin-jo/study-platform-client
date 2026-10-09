import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicProfilePage from '@/app/(public-seo)/(landing-shell)/members/[profileUuid]/page';
import type { PublicProfileResponse } from '@/types/api/public-profile.types';

const { getPublicProfileInServer } = vi.hoisted(() => ({
  getPublicProfileInServer: vi.fn(),
}));

vi.mock('@/api/endpoints/community/public-profile.server', () => ({
  getPublicProfileInServer,
}));

vi.mock('@/components/community/public-profile-content', () => ({
  default: () => null,
}));

const profile: PublicProfileResponse = {
  publicProfileUuid: '00000000-0000-4000-8000-000000000001',
  nickname: '빈 프로필',
  simpleIntroduction: null,
  buildGoal: null,
  weeksTogether: 0,
  weeksTogetherLabel: '0주째 함께하고 있어요',
  rooms: { items: [] },
  posts: { items: [] },
  canonicalPath: '/members/00000000-0000-4000-8000-000000000001',
  indexEligibility: {
    indexable: false,
    reason: 'NO_PUBLIC_ACTIVITY',
  },
  updatedAt: '2026-08-08T00:00:00+09:00',
};

describe('public profile metadata', () => {
  beforeEach(() => {
    getPublicProfileInServer.mockResolvedValue(profile);
  });

  it('renders robots noindex in the initial HTML for a profile without public activity', async () => {
    const page = await PublicProfilePage({
      params: Promise.resolve({ profileUuid: profile.publicProfileUuid }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('name="robots"');
    expect(html).toContain('content="noindex,follow"');
  });

  it('renders index,follow in the initial HTML for an indexable profile', async () => {
    getPublicProfileInServer.mockResolvedValue({
      ...profile,
      indexEligibility: { indexable: true, reason: 'INDEXABLE' },
    });

    const page = await PublicProfilePage({
      params: Promise.resolve({ profileUuid: profile.publicProfileUuid }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('name="robots"');
    expect(html).toContain('content="index,follow"');
    expect(html).toContain('application/ld+json');
  });
});
