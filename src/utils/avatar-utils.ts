const AVATAR_COUNT = 8;

/**
 * 기본(랜덤) 아바타 경로. 백엔드가 온보딩 시 저장한 profileImageNumber(1~8)가
 * 있으면 그 값을 우선 사용하고, 없으면 memberId 기반 결정적 값으로 폴백한다.
 */
export function getDefaultAvatarSrc(
  memberId: number | null | undefined,
  profileImageNumber?: number | null,
): string {
  if (
    profileImageNumber !== null &&
    profileImageNumber !== undefined &&
    profileImageNumber >= 1 &&
    profileImageNumber <= AVATAR_COUNT
  ) {
    return `/images/${profileImageNumber}.png`;
  }
  if (memberId === null || memberId === undefined)
    return '/profile-default.svg';
  return `/images/${(memberId % AVATAR_COUNT) + 1}.png`;
}

export function getRandomDefaultAvatarSrc(currentSrc?: string): string {
  let index = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  if (currentSrc === `/images/${index}.png`) {
    index = (index % AVATAR_COUNT) + 1;
  }
  return `/images/${index}.png`;
}

/** 기본 아바타 src 경로(/images/{n}.png). 번호가 범위를 벗어나면 1로 폴백. */
export function avatarSrcByNumber(profileImageNumber: number): string {
  const n =
    profileImageNumber >= 1 && profileImageNumber <= AVATAR_COUNT
      ? profileImageNumber
      : 1;
  return `/images/${n}.png`;
}

/**
 * 랜덤 기본 아바타 번호(1~8). current 와 같으면 다른 번호로 한 칸 이동해
 * "다시 뽑기" 시 같은 그림이 그대로 나오지 않게 한다.
 */
export function getRandomDefaultAvatarNumber(current?: number | null): number {
  let index = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  if (current && index === current) {
    index = (index % AVATAR_COUNT) + 1;
  }
  return index;
}
