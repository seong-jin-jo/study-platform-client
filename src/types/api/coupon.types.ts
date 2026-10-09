export type CouponDiscountType = 'FIXED' | 'PERCENT' | 'FREE';
export type MemberCouponStatus = 'REGISTERED' | 'USED';

export interface AdminCouponBulkCreateRequest {
  prefix: string;
  quantity: number;
  discountType: CouponDiscountType;
  discountValue: number | null;
  validDays: number | null;
  transferable: boolean;
  active: boolean;
}

export interface CouponResponse {
  couponId: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number | null;
  maxUses: number;
  usedCount: number;
  active: boolean;
  transferable: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

export interface CouponCodeRegisterRequest {
  code: string;
}

export interface MyCouponResponse {
  memberCouponId: number;
  couponId: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number | null;
  status: MemberCouponStatus;
  registeredAt: string;
  usedAt: string | null;
  validUntil: string | null;
}
