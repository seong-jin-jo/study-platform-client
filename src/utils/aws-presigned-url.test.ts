import { describe, expect, it } from 'vitest';
import {
  getRenderableImageUrl,
  isAwsPresignedUrl,
  isExpiredAwsPresignedUrl,
} from './aws-presigned-url';

const signedUrl =
  'https://uploaded-files-qa.example.com/images/profile-image/a.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260612T210346Z&X-Amz-Expires=3600&X-Amz-Signature=abc';

describe('aws-presigned-url', () => {
  it('detects AWS presigned URLs', () => {
    expect(isAwsPresignedUrl(signedUrl)).toBe(true);
    expect(isAwsPresignedUrl('https://example.com/images/a.png')).toBe(false);
  });

  it('detects expired AWS presigned URLs from X-Amz-Date and X-Amz-Expires', () => {
    const expiredAt = Date.UTC(2026, 5, 12, 22, 3, 46);

    expect(isExpiredAwsPresignedUrl(signedUrl, expiredAt)).toBe(true);
    expect(isExpiredAwsPresignedUrl(signedUrl, expiredAt - 1)).toBe(false);
  });

  it('omits expired AWS presigned URLs before image rendering', () => {
    const expiredAt = Date.UTC(2026, 5, 12, 22, 3, 46);

    expect(getRenderableImageUrl(signedUrl, expiredAt)).toBeUndefined();
    expect(getRenderableImageUrl(signedUrl, expiredAt - 1)).toBe(signedUrl);
    expect(getRenderableImageUrl(' https://example.com/a.png ')).toBe(
      'https://example.com/a.png',
    );
  });
});
