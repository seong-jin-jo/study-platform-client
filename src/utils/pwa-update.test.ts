import { describe, expect, it } from 'vitest';

import {
  getPwaReloadAction,
  hasNewAppCommit,
  PWA_VERSION_CHECK_INTERVAL_MS,
  shouldCheckPwaVersion,
} from './pwa-update';

describe('PWA 새 배포 반영 계약', () => {
  it('PWA-UPDATE-001 현재 빌드와 배포 커밋이 다를 때만 업데이트 대상으로 판정한다', () => {
    expect(hasNewAppCommit('old-commit', 'new-commit')).toBe(true);
    expect(hasNewAppCommit('same-commit', 'same-commit')).toBe(false);
    expect(hasNewAppCommit('unavailable', 'new-commit')).toBe(false);
    expect(hasNewAppCommit('old-commit', '')).toBe(false);
  });

  it('PWA-UPDATE-002 같은 커밋을 이미 재로딩한 세션은 반복 재로딩하지 않는다', () => {
    expect(
      getPwaReloadAction({
        activeElement: undefined,
        guardedCommit: 'new-commit',
        targetCommit: 'new-commit',
      }),
    ).toBe('none');
    expect(
      getPwaReloadAction({
        activeElement: undefined,
        guardedCommit: 'previous-commit',
        targetCommit: 'new-commit',
      }),
    ).toBe('reload');
  });

  it.each([
    'input',
    'textarea',
  ])('PWA-UPDATE-003 %s 입력에 포커스가 있으면 재로딩을 다음 visible까지 미룬다', (tagName) => {
    expect(
      getPwaReloadAction({
        activeElement: { tagName },
        guardedCommit: undefined,
        targetCommit: 'new-commit',
      }),
    ).toBe('defer');
  });

  it('PWA-UPDATE-004 contenteditable 입력 중에도 재로딩을 미룬다', () => {
    expect(
      getPwaReloadAction({
        activeElement: { isContentEditable: true, tagName: 'DIV' },
        guardedCommit: undefined,
        targetCommit: 'new-commit',
      }),
    ).toBe('defer');
  });

  it('PWA-UPDATE-005 visible 복귀 검사는 최소 5분 간격을 지킨다', () => {
    expect(
      shouldCheckPwaVersion({
        lastCheckedAt: 1_000,
        now: 1_000 + PWA_VERSION_CHECK_INTERVAL_MS - 1,
        visibilityState: 'visible',
      }),
    ).toBe(false);
    expect(
      shouldCheckPwaVersion({
        lastCheckedAt: 1_000,
        now: 1_000 + PWA_VERSION_CHECK_INTERVAL_MS,
        visibilityState: 'visible',
      }),
    ).toBe(true);
    expect(
      shouldCheckPwaVersion({
        lastCheckedAt: undefined,
        now: 1_000,
        visibilityState: 'hidden',
      }),
    ).toBe(false);
  });
});
