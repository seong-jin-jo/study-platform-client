import { describe, expect, it } from 'vitest';
import {
  getNotificationDestinationPath,
  parseNotificationDestination,
} from '@/types/api/notification.types';

describe('notification destination contract', () => {
  it('uses the server-provided destination without rebuilding a path', () => {
    const destination = parseNotificationDestination({
      state: 'AVAILABLE',
      path: '/community/913#comments',
      message: null,
    });

    expect(getNotificationDestinationPath({ id: 1, destination })).toBe(
      '/community/913#comments',
    );
  });

  it('keeps a deleted target on the server-provided fallback route', () => {
    const destination = parseNotificationDestination({
      state: 'FALLBACK',
      path: '/my-page/notification',
      message: '원문이 삭제되었거나 지금은 볼 수 없어요.',
    });

    expect(destination).toEqual({
      state: 'FALLBACK',
      path: '/my-page/notification',
      message: '원문이 삭제되었거나 지금은 볼 수 없어요.',
    });
  });

  it('does not make an unknown destination clickable', () => {
    expect(
      parseNotificationDestination({ state: 'UNKNOWN', path: '/admin' }),
    ).toBeUndefined();
  });
});
