import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectableCard } from '@/components/common/ui/selectable-card';

describe('SelectableCard', () => {
  it('renders a labelled list-backed radio group without hidden inputs', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SelectableCard.Group,
        { defaultValue: 'one', label: '목표 선택' },
        createElement(SelectableCard.Item, { value: 'one' }, '첫 번째'),
        createElement(SelectableCard.Item, { value: 'two' }, '두 번째'),
      ),
    );

    expect(markup).toContain('<ul');
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-label="목표 선택"');
    expect(markup).toContain('<li class="min-w-0" role="none">');
    expect(markup).toContain('role="radio"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).not.toContain('<input');
  });

  it('keeps a disabled card focusable and exposes the reason', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SelectableCard.Group,
        { label: '목표 선택' },
        createElement(
          SelectableCard.Item,
          {
            disabled: true,
            disabledReason: '다음 단계에서 열려요',
            value: 'locked',
          },
          '잠긴 카드',
        ),
      ),
    );

    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('다음 단계에서 열려요');
  });

  it('keeps compound consumer content as direct flex children', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SelectableCard.Group,
        { label: '교체할 방' },
        createElement(
          SelectableCard.Item,
          { value: 'room-1' },
          createElement('span', { 'data-card-media': true }, '이미지'),
          createElement('span', { 'data-card-copy': true }, '방 이름과 설명'),
          createElement('span', { 'data-card-badge': true }, '바꾸기 좋음'),
        ),
      ),
    );
    expect(markup).toMatch(
      /role="radio"[^>]*><span data-card-media="true">이미지<\/span><span data-card-copy="true">방 이름과 설명<\/span><span data-card-badge="true">바꾸기 좋음<\/span><\/div>/,
    );
  });
});
