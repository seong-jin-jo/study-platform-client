import { axiosInstance } from '@/api/client/axios';
import type { KoanDetail, KoanPage } from '@/types/insights/koan';

interface KoanEnvelope<T> {
  data?: T;
  content?: T;
}

const unwrap = <T>(envelope: KoanEnvelope<T>): T => {
  const value = envelope.data ?? envelope.content;

  if (!value) {
    throw new Error('화두 응답에 data가 없습니다.');
  }

  return value;
};

export const getKoans = async ({
  page = 1,
  size = 20,
  categorySlug,
}: {
  page?: number;
  size?: number;
  categorySlug?: string;
} = {}) => {
  const response = await axiosInstance.get<KoanEnvelope<KoanPage>>('koans', {
    params: { page, size, categorySlug },
  });

  return unwrap(response.data);
};

export const getKoan = async (koanId: number) => {
  const response = await axiosInstance.get<KoanEnvelope<KoanDetail>>(
    `koans/${koanId}`,
  );

  return unwrap(response.data);
};

export const getKoanCorrections = async (koanId: number) => {
  const response = await axiosInstance.get<
    KoanEnvelope<KoanDetail['corrections']>
  >(`koans/${koanId}/corrections`);

  return unwrap(response.data);
};
