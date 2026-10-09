import { describe, expect, it, vi } from 'vitest';
import { fetchPrivateArticleBodyWithRefresh } from './private-article-body';

describe('private article body expired-token recovery', () => {
  it('refreshes once after 401 and retries the same body request', async () => {
    const article = { documentId: 'doc-1', slug: 'event-loop' };
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          article,
          access: { level: 'UNLOCKED', authDegraded: false },
        }),
      );
    const refresh = vi.fn().mockResolvedValue({
      state: 'success',
      accessToken: 'fresh-token',
    });

    await expect(
      fetchPrivateArticleBodyWithRefresh('event-loop', request, refresh),
    ).resolves.toMatchObject({ article });
    expect(refresh).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  });

  it('does not loop when refresh cannot recover the session', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const refresh = vi.fn().mockResolvedValue({ state: 'invalid' });

    await expect(
      fetchPrivateArticleBodyWithRefresh('event-loop', request, refresh),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
  });
});
