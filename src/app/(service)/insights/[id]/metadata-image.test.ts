import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSIGHT_SHARE_IMAGE,
  resolvePublicMetadataImage,
} from './metadata-image';

describe('insight metadata image', () => {
  it('uses the long-lived public OG asset as the fallback', () => {
    expect(DEFAULT_INSIGHT_SHARE_IMAGE).toBe(
      'https://www.zeroone.it.kr/images/og-image.png',
    );
  });

  it.each([
    undefined,
    '',
    '/uploads/cover.png',
    'http://localhost:1337/uploads/cover.png',
    'http://strapi:1337/uploads/cover.png',
    'http://10.0.0.5:1337/uploads/cover.png',
    'ftp://cdn.example.com/cover.png',
  ])('공개 클라이언트가 열 수 없는 %s는 검증된 기본 이미지로 대체한다', (value) => {
    expect(resolvePublicMetadataImage(value)).toBe(DEFAULT_INSIGHT_SHARE_IMAGE);
  });

  it('공개 HTTPS 이미지 URL은 보존한다', () => {
    expect(
      resolvePublicMetadataImage('https://cdn.example.com/cover.png'),
    ).toBe('https://cdn.example.com/cover.png');
  });
});
