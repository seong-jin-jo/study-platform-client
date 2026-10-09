import { describe, expect, it } from 'vitest';
import {
  BENEFIT_CARDS,
  getVisibleBenefitCards,
} from './class-detail-benefits-data';

describe('클래스 혜택 노출 계약', () => {
  it('AIT-m4-01 웹 기본값은 기존 혜택을 모두 유지한다', () => {
    expect(getVisibleBenefitCards()).toBe(BENEFIT_CARDS);
    expect(getVisibleBenefitCards().map((card) => card.title)).toContain(
      'Claude Code Pro 1개월 구독권을 드려요',
    );
  });

  it('AIT-m4-02 앱 소개는 구독권과 결제 문구가 든 상업 혜택을 제외한다', () => {
    const appCards = getVisibleBenefitCards(true);

    expect(appCards.map((card) => card.title)).not.toContain(
      'Claude Code Pro 1개월 구독권을 드려요',
    );
    expect(appCards).toHaveLength(BENEFIT_CARDS.length - 1);
  });
});
