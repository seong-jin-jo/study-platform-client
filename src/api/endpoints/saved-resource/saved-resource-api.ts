import { axiosInstance } from '@/api/client/axios';
import type {
  SavedResourceList,
  SavedResourceMutationResult,
  SavedResourceType,
} from '@/types/saved-resource';

interface ApiResponse<T> {
  content: T;
}

export async function getSavedResources({
  cursor,
  size = 20,
  types,
}: {
  cursor?: string;
  size?: number;
  types?: SavedResourceType[];
} = {}) {
  const { data } = await axiosInstance.get<ApiResponse<SavedResourceList>>(
    'saved-resources',
    {
      params: {
        size,
        ...(cursor ? { cursor } : {}),
        ...(types?.length ? { types: types.join(',') } : {}),
      },
    },
  );

  return data.content;
}

export async function setSavedResource({
  resourceKey,
  resourceType,
  saved,
}: {
  resourceKey: string;
  resourceType: SavedResourceType;
  saved: boolean;
}) {
  const { data } = await axiosInstance.put<
    ApiResponse<SavedResourceMutationResult>
  >(`saved-resources/${resourceType}/${encodeURIComponent(resourceKey)}`, {
    saved,
  });

  return data.content;
}
