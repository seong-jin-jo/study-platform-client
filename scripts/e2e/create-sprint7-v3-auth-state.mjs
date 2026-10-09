import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const apiUrl = process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const memberId = process.env.E2E_SPRINT7_MEMBER_ID?.trim();

if (!memberId || !/^\d+$/.test(memberId)) {
  throw new Error('E2E_SPRINT7_MEMBER_ID must be a positive integer');
}

const tokenResponse = await fetch(
  `${apiUrl}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
);
if (!tokenResponse.ok) {
  throw new Error(`QA token mint failed with status ${tokenResponse.status}`);
}
const tokenEnvelope = await tokenResponse.json();
const token = tokenEnvelope?.content?.accessToken;
if (typeof token !== 'string' || !token) {
  throw new Error('QA token mint response did not include an access token');
}

const url = new URL(baseUrl);
const target = path.resolve('e2e/fixtures/auth.json');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(
  target,
  `${JSON.stringify(
    {
      cookies: [
        {
          name: 'accessToken',
          value: token,
          domain: url.hostname,
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: url.protocol === 'https:',
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
    null,
    2,
  )}\n`,
  { encoding: 'utf8', mode: 0o600 },
);
