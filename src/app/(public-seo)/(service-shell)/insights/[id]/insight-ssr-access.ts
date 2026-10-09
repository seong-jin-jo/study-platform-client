export function mayRenderPublicBody(
  cachedIsAccessibleForFree: boolean,
  liveState: 'FREE' | 'UNLOCKED' | 'LOCKED',
): boolean {
  return cachedIsAccessibleForFree && liveState === 'FREE';
}

export function accessSnapshotMatches(
  cachedIsAccessibleForFree: boolean,
  liveState: 'FREE' | 'UNLOCKED' | 'LOCKED',
): boolean {
  return cachedIsAccessibleForFree === (liveState === 'FREE');
}
