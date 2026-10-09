import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MotionProvider, {
  MOTION_REDUCED_MOTION_POLICY,
} from '@/providers/motion-provider';

describe('MotionProvider', () => {
  it('uses the user reduced-motion preference as the global policy', () => {
    expect(MOTION_REDUCED_MOTION_POLICY).toBe('user');
  });

  it('keeps server-rendered children available across the client boundary', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MotionProvider,
        null,
        createElement('span', { 'data-motion-child': true }, 'content'),
      ),
    );

    expect(markup).toContain('data-motion-child="true"');
    expect(markup).toContain('content');
  });
});
