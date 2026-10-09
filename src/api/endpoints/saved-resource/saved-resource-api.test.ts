import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosInstance } from '@/api/client/axios';
import { SAVED_RESOURCE_TYPE } from '@/types/saved-resource';
import { getSavedResources, setSavedResource } from './saved-resource-api';

vi.mock('@/api/client/axios', () => ({
  axiosInstance: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedGet = vi.mocked(axiosInstance.get);
const mockedPut = vi.mocked(axiosInstance.put);

describe('saved resource api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the mixed saved list with the opaque cursor unchanged', async () => {
    const content = {
      items: [],
      nextCursor: 'opaque-next',
    };
    mockedGet.mockResolvedValue({ data: { content } });

    await expect(
      getSavedResources({
        cursor: 'opaque-current',
        size: 20,
        types: [SAVED_RESOURCE_TYPE.COMMUNITY_POST],
      }),
    ).resolves.toEqual(content);
    expect(mockedGet).toHaveBeenCalledWith('saved-resources', {
      params: {
        cursor: 'opaque-current',
        size: 20,
        types: SAVED_RESOURCE_TYPE.COMMUNITY_POST,
      },
    });
  });

  it('sends and returns both desired states for a save round trip', async () => {
    mockedPut
      .mockResolvedValueOnce({
        data: {
          content: {
            resourceType: SAVED_RESOURCE_TYPE.COMMUNITY_POST,
            resourceKey: '913',
            saved: true,
            resourceState: 'AVAILABLE',
            updatedAt: '2026-08-06T10:00:00+09:00',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: {
            resourceType: SAVED_RESOURCE_TYPE.COMMUNITY_POST,
            resourceKey: '913',
            saved: false,
            resourceState: 'AVAILABLE',
            updatedAt: '2026-08-06T10:01:00+09:00',
          },
        },
      });

    const saved = await setSavedResource({
      resourceType: SAVED_RESOURCE_TYPE.COMMUNITY_POST,
      resourceKey: '913',
      saved: true,
    });
    const unsaved = await setSavedResource({
      resourceType: SAVED_RESOURCE_TYPE.COMMUNITY_POST,
      resourceKey: '913',
      saved: false,
    });

    expect(saved.saved).toBe(true);
    expect(unsaved.saved).toBe(false);
    expect(mockedPut).toHaveBeenNthCalledWith(
      1,
      'saved-resources/COMMUNITY_POST/913',
      { saved: true },
    );
    expect(mockedPut).toHaveBeenNthCalledWith(
      2,
      'saved-resources/COMMUNITY_POST/913',
      { saved: false },
    );
  });
});
