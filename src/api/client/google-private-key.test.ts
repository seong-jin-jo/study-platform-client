import { afterEach, describe, expect, it } from 'vitest';
import { resolveGooglePrivateKey } from './google-private-key';

const ORIGINAL_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const ORIGINAL_PRIVATE_KEY_B64 = process.env.GOOGLE_PRIVATE_KEY_B64;

const restoreEnv = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
};

describe('resolveGooglePrivateKey', () => {
  afterEach(() => {
    restoreEnv('GOOGLE_PRIVATE_KEY', ORIGINAL_PRIVATE_KEY);
    restoreEnv('GOOGLE_PRIVATE_KEY_B64', ORIGINAL_PRIVATE_KEY_B64);
  });

  it('decodes the base64 key before creating Google credentials', () => {
    const pem =
      '-----BEGIN PRIVATE KEY-----\nline-1\nline-2\n-----END PRIVATE KEY-----';
    process.env.GOOGLE_PRIVATE_KEY_B64 = Buffer.from(pem).toString('base64');
    process.env.GOOGLE_PRIVATE_KEY = 'fallback';

    expect(resolveGooglePrivateKey()).toBe(pem);
  });

  it('keeps the legacy escaped-newline key as a fallback', () => {
    delete process.env.GOOGLE_PRIVATE_KEY_B64;
    process.env.GOOGLE_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nline\\n-----END PRIVATE KEY-----';

    expect(resolveGooglePrivateKey()).toBe(
      '-----BEGIN PRIVATE KEY-----\nline\n-----END PRIVATE KEY-----',
    );
  });
});
