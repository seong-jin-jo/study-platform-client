import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/home',
          '/study',
          '/study/*',
          '/community',
          '/community/*',
          '/insights',
          '/insights/*',
          '/members/*',
        ],
        disallow: [
          '/login',
          '/sign-up',
          '/my-page',
          '/my-study',
          '/my-study-review',
          '/redirection',
          '/admin',
          '/admin/*',
          '/api/',
          '/community/write',
          '/community/*/edit',
          '/community/questions/write',
          '/community/questions/*/edit',
          '/_next/',
          '/_vercel/',
        ],
      },
    ],
    sitemap: 'https://www.zeroone.it.kr/sitemap.xml',
  };
}
