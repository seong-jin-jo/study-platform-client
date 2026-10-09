// @vitest-environment jsdom

import { sendGTMEvent } from '@next/third-parties/google';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GTM runtime without public analytics IDs', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', '');
    window.dataLayer = undefined;
  });

  it('queues a custom event without throwing', () => {
    expect(() =>
      sendGTMEvent({ event: 'runtime_probe', source: 'unit-test' }),
    ).not.toThrow();
    expect(window.dataLayer).toEqual([
      { event: 'runtime_probe', source: 'unit-test' },
    ]);
  });
});
