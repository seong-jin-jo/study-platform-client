/* eslint-disable @rushstack/no-new-null -- backend JSON contract explicitly returns null messages. */
import type { MemberNotificationResponse } from '@/api/openapi';

export type NotificationDestination =
  | { state: 'AVAILABLE'; path: string; message?: null }
  | { state: 'FALLBACK'; path: string; message: string };

// 생성된 OpenAPI 타입의 destination은 구조가 느슨해서, 화면에서 쓰는 판별 유니온으로 좁힌다.
export interface MemberNotificationWithDestination
  extends Omit<MemberNotificationResponse, 'destination'> {
  destination?: NotificationDestination;
}

export function parseNotificationDestination(
  value: unknown,
): NotificationDestination | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const destination = value as Record<string, unknown>;
  if (
    destination.state === 'AVAILABLE' &&
    typeof destination.path === 'string'
  ) {
    return { state: 'AVAILABLE', path: destination.path };
  }
  if (
    destination.state === 'FALLBACK' &&
    typeof destination.path === 'string' &&
    typeof destination.message === 'string'
  ) {
    return {
      state: 'FALLBACK',
      path: destination.path,
      message: destination.message,
    };
  }
  return undefined;
}

export function getNotificationDestinationPath(
  notification: MemberNotificationWithDestination,
): string | undefined {
  return notification.destination?.path;
}
