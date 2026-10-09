import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addStudyReadyFormToGoogleSheets,
  hasGoogleSheetsConfig,
} from '@/api/client/google-sheets';
import { POST } from './route';

vi.mock('@/api/client/google-sheets', () => ({
  addStudyReadyFormToGoogleSheets: vi.fn(),
  hasGoogleSheetsConfig: vi.fn(),
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/study-ready-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/study-ready-form', () => {
  beforeEach(() => {
    vi.mocked(addStudyReadyFormToGoogleSheets).mockReset();
    vi.mocked(hasGoogleSheetsConfig).mockReset();
    vi.mocked(hasGoogleSheetsConfig).mockReturnValue(false);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SHEETS_ID', '');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', '');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', '');
    vi.stubEnv('STIBEE_API_KEY', '');
    vi.stubEnv('STIBEE_LIST_ID', '');
    vi.stubEnv('STIBEE_API_BASE_URL', '');
    vi.stubEnv('STIBEE_FIELD_COURSES', '');
    vi.stubEnv('STIBEE_FIELD_CONCERN', '');
    vi.stubEnv('STIBEE_FIELD_SOURCE', '');
    vi.stubEnv('STIBEE_FIELD_SUBMITTED_AT', '');
  });

  it('saves an explicitly opted-in lead to Stibee with lower-cased email and update enabled', async () => {
    vi.stubEnv('STIBEE_API_KEY', 'test-api-key');
    vi.stubEnv('STIBEE_LIST_ID', '12345');

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      createRequest({
        courses: ['  Vibe Coding  ', ''],
        concern: '  Need roadmap  ',
        email: 'USER@EXAMPLE.COM ',
        agree: true,
        marketingConsent: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.stibee.com/v2/lists/12345/subscribers');
    expect(init?.headers).toEqual({
      AccessToken: 'test-api-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      subscriber: {
        email: 'user@example.com',
        status: 'subscribed',
        marketingAllowed: true,
      },
      updateEnabled: true,
    });
  });

  it('defaults omitted marketing consent to false while retaining required privacy consent', async () => {
    vi.stubEnv('STIBEE_API_KEY', 'test-api-key');
    vi.stubEnv('STIBEE_LIST_ID', '12345');

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      createRequest({
        courses: ['Vibe Coding'],
        concern: '',
        email: 'user@example.com',
        agree: true,
      }),
    );

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      subscriber: { marketingAllowed: false },
    });
  });

  it('returns 503 when no lead sink is configured', async () => {
    const response = await POST(
      createRequest({
        courses: ['Vibe Coding'],
        concern: '',
        email: 'user@example.com',
        agree: true,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: '제출 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('returns 503 when an opted-in lead cannot be saved to Stibee even if Sheets succeeds', async () => {
    vi.stubEnv('STIBEE_API_KEY', 'test-api-key');
    vi.stubEnv('STIBEE_LIST_ID', '12345');
    vi.mocked(hasGoogleSheetsConfig).mockReturnValue(true);
    vi.mocked(addStudyReadyFormToGoogleSheets).mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('failed', { status: 500 })),
    );

    const response = await POST(
      createRequest({
        courses: ['Vibe Coding'],
        concern: '',
        email: 'user@example.com',
        agree: true,
        marketingConsent: true,
      }),
    );

    expect(response.status).toBe(503);
    expect(vi.mocked(addStudyReadyFormToGoogleSheets)).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: true }),
    );
  });

  it('accepts a non-marketing lead when Sheets succeeds even if Stibee fails', async () => {
    vi.stubEnv('STIBEE_API_KEY', 'test-api-key');
    vi.stubEnv('STIBEE_LIST_ID', '12345');
    vi.mocked(hasGoogleSheetsConfig).mockReturnValue(true);
    vi.mocked(addStudyReadyFormToGoogleSheets).mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('failed', { status: 500 })),
    );

    const response = await POST(
      createRequest({
        courses: ['Vibe Coding'],
        concern: '',
        email: 'user@example.com',
        agree: true,
        marketingConsent: false,
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(addStudyReadyFormToGoogleSheets)).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: false }),
    );
  });

  it('rejects invalid emails before touching external sinks', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      createRequest({
        courses: ['Vibe Coding'],
        concern: '',
        email: 'not-an-email',
        agree: true,
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
