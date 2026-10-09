/**
 * SPRINT8 dev 스펙의 **전제 미충족**을 통과로 위장하지 않기 위한 사유 모음.
 *
 * qa-plan-sprint8-v1.0.0.md §2 가 정한 규칙은 하나다.
 * 건너뛴 케이스는 `미실시(사유)` 로 남기고 통과로 올리지 않는다.
 * 그래서 각 사유를 여기 한곳에 모아 문장으로 남긴다. 스킵 로그를 읽는 사람이
 * "왜 안 돌았는지" 를 그 자리에서 알 수 있어야 한다.
 */

/** 회장 결정이 나기 전에는 기대값을 확정할 수 없는 경우. */
export const horizonDecisionPending =
  '섬 초과분을 "수평선 너머 N곳" 으로 접을지가 회장 결정 대기 중이라 기대값을 확정할 수 없다. ' +
  'PR #457(2026-08-14)이 "시안에 없는 요소"라며 표지를 지웠으나, 승인 시안의 데이터 "아주 많을 때" ' +
  '상태에는 그 표지가 실재한다(2026-08-21 캡처로 확인). 되살릴지 폐기할지가 정해지면 이 스펙을 되살린다.';

/** dev 인사이트 본문이 아직 안 뜨는 동안. */
export const articleBodyMissing =
  'dev 인사이트 본문이 아직 렌더되지 않아 본문 의존 단언을 실행할 수 없다. ' +
  '원인은 draft 조회 분기 누락이었고 코드는 고쳤다(strapiFetchNoStore 가 status=draft 를 안 붙였다). ' +
  '배포 후 본문이 뜨면 이 스펙이 다시 돈다.';

/** 무료 공개 편의 본문이 실제로 렌더되는지 확인한다. */
export async function articleBodyRenders(
  baseURL: string | undefined,
  slug: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL ?? ''}/insights/${slug}`);
    if (!response.ok) return false;
    return !(await response.text()).includes('내용이 없습니다');
  } catch {
    return false;
  }
}

/** 읽기 예산을 소비하는 스펙은 잔액이 상한과 같을 때만 성립한다. */
export const readingBudgetDrained = (balance: number, cap: number) =>
  `읽기 예산이 상한과 달라(${balance}/${cap}) 소비 시나리오가 성립하지 않는다. ` +
  '이 스펙은 실행마다 잔액을 1 소비하는데 같은 회원을 재사용해서 실행할수록 잔액이 줄어든다. ' +
  '회당 새 회원을 쓰거나 실행 전 잔액을 초기화해야 한다.';

/** 잔액 0 회원 식별자가 설정되지 않은 경우. */
export const zeroBalanceMemberUnset =
  'E2E_SPRINT8_GH_025_MEMBER_ID 가 설정되지 않았다. ' +
  '기본값 회원은 잔액이 0 이 아니라 이 스펙의 전제(잔액 0)를 만족하지 못한다. ' +
  '잔액 0 회원 ID 를 지정하면 실행된다.';

/** 완독 시나리오는 아직 안 읽은 글에서만 성립한다. */
export const articleAlreadyRead = (slug: string) =>
  `대상 글(${slug})이 이미 READ 상태라 완독 전환 시나리오가 성립하지 않는다. ` +
  '이 스펙은 실행하면서 글을 읽음으로 바꾸는데 같은 회원·같은 글을 재사용해서 ' +
  '두 번째 실행부터는 전제가 깨진다. 회당 새 회원을 쓰거나 실행 전 읽음 상태를 되돌려야 한다.';

/** dev 질문 픽스처가 백엔드 자신의 규칙을 어긴 값으로 저장돼 조회가 안 되는 경우. */
export const qnaFixtureUnreadable = (questionId: number) =>
  `dev 질문 픽스처(${questionId})가 조회되지 않아 실행할 수 없다(미실시). ` +
  '백엔드가 400 CMM001 을 낸다: "fileUri는 null이거나 \'/\'로 시작할 수 없습니다". ' +
  '저장은 됐는데 읽을 수 없는 데이터다. 테스트 값을 바꿔서 풀리는 문제가 아니라 ' +
  '시드를 선행 슬래시 없이 다시 넣어야 한다. 소유자 확인 필요.';
