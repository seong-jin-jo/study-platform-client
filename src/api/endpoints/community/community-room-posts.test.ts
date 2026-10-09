import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosInstance } from '@/api/client/axios';
import { getCommunityPosts } from './community-room-posts';

vi.mock('@/api/client/axios', () => ({
  axiosInstance: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(axiosInstance.get);

describe('public community posts api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the public feed without a room filter', async () => {
    const content = {
      popularItems: [],
      items: [],
      page: 1,
      size: 5,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
      totalPostCount: 0,
    };
    mockedGet.mockResolvedValue({ data: { content } });

    await expect(getCommunityPosts()).resolves.toEqual(content);
    expect(mockedGet).toHaveBeenCalledWith('/community/posts', {
      params: { page: 1, size: 5 },
    });
  });
});
