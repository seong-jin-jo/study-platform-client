import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { axiosInstanceV5 } from '@/api/client/axios';
import { useToastStore } from '@/stores/use-toast-store';
import type {
  AdminCouponBulkCreateRequest,
  CouponCodeRegisterRequest,
  CouponResponse,
  MyCouponResponse,
} from '@/types/api/coupon.types';

export const COUPON_QUERY_KEYS = {
  adminCoupons: ['adminCoupons'] as const,
  myCoupons: ['myCoupons'] as const,
};

export const useGetAdminCoupons = (): UseQueryResult<CouponResponse[]> => {
  return useQuery({
    queryKey: COUPON_QUERY_KEYS.adminCoupons,
    queryFn: async () => {
      const { data } = await axiosInstanceV5.get<{
        content: CouponResponse[];
      }>('admin/coupons');
      return data.content;
    },
  });
};

export const useCreateAdminCoupons = (): UseMutationResult<
  CouponResponse[],
  Error,
  AdminCouponBulkCreateRequest
> => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (request: AdminCouponBulkCreateRequest) => {
      const { data } = await axiosInstanceV5.post<{
        content: CouponResponse[];
      }>('admin/coupons/bulk', request);
      return data.content;
    },
    onSuccess: async (createdCoupons) => {
      await queryClient.invalidateQueries({
        queryKey: COUPON_QUERY_KEYS.adminCoupons,
      });
      showToast(`${createdCoupons.length}장 쿠폰을 생성했습니다.`, 'success');
    },
  });
};

export const useGetMyCoupons = (): UseQueryResult<MyCouponResponse[]> => {
  return useQuery({
    queryKey: COUPON_QUERY_KEYS.myCoupons,
    queryFn: async () => {
      const { data } = await axiosInstanceV5.get<{
        content: MyCouponResponse[];
      }>('coupons/me');
      return data.content;
    },
  });
};

export const useRegisterCoupon = (): UseMutationResult<
  MyCouponResponse,
  Error,
  CouponCodeRegisterRequest
> => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (request: CouponCodeRegisterRequest) => {
      const { data } = await axiosInstanceV5.post<{
        content: MyCouponResponse;
      }>('coupons/register', request);
      return data.content;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COUPON_QUERY_KEYS.myCoupons,
      });
      showToast('쿠폰이 등록되었습니다.', 'success');
    },
  });
};
