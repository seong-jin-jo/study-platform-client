import { useQuery } from '@tanstack/react-query';
import {
  getKoan,
  getKoanCorrections,
  getKoans,
} from '@/api/endpoints/insights/koan-api';

export const koanKeys = {
  all: ['koans'] as const,
  list: (categorySlug?: string) =>
    [...koanKeys.all, 'list', categorySlug ?? 'all'] as const,
  detail: (koanId: number) => [...koanKeys.all, 'detail', koanId] as const,
};

export const useKoansQuery = (
  params: { page?: number; size?: number; categorySlug?: string } = {},
) =>
  useQuery({
    queryKey: [...koanKeys.list(params.categorySlug), params],
    queryFn: () => getKoans(params),
    retry: false,
  });

export const useKoanQuery = (koanId: number) =>
  useQuery({
    queryKey: koanKeys.detail(koanId),
    queryFn: async () => {
      const [koan, corrections] = await Promise.all([
        getKoan(koanId),
        getKoanCorrections(koanId),
      ]);

      return { ...koan, corrections };
    },
    enabled: koanId > 0,
    retry: false,
  });
