import { describe, expect, it } from 'vitest';
import { resolveMarkdownAssetUrl } from './markdown-content-assets';

describe('resolveMarkdownAssetUrl', () => {
  it('does not resolve expired AWS presigned URLs', () => {
    const expiredUrl =
      'https://uploaded-files-qa.example.com/images/community-post-content/a.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260612T210346Z&X-Amz-Expires=3600&X-Amz-Signature=abc';

    expect(resolveMarkdownAssetUrl(expiredUrl)).toBeUndefined();
  });

  it('keeps non-expired external image URLs unchanged', () => {
    expect(resolveMarkdownAssetUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png',
    );
  });

  it('does not resolve literal "null"/"undefined" image URLs', () => {
    expect(resolveMarkdownAssetUrl('null')).toBeUndefined();
    expect(resolveMarkdownAssetUrl('NULL')).toBeUndefined();
    expect(resolveMarkdownAssetUrl('undefined')).toBeUndefined();
  });
});
