import type { Metadata } from 'next';
import LandingContent from '@/components/landing/landing-content';

export const metadata: Metadata = {
  title: 'ZERO ONE IT | 노베이스 바이브코딩 입문',
  description: '코딩 몰라도 OK. 따라만 하면 나도 AI 시대의 경쟁력 UP!',
  keywords: [
    '바이브코딩',
    '노베이스 코딩',
    'AI 개발',
    '비개발자',
    '클로드 코드',
    '입문 강의',
    'IT 커뮤니티',
  ],
  alternates: { canonical: 'https://www.zeroone.it.kr/home' },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  openGraph: {
    type: 'website',
    url: 'https://www.zeroone.it.kr/home',
    title: 'ZERO ONE IT | Built by people who started at zero.',
    description:
      '코딩 몰라도 OK. 따라만 하면 나도 AI 시대의 경쟁력 UP! 완전 초보를 위한 바이브코딩 입문.',
    siteName: 'ZERO ONE IT',
    images: [
      {
        url: 'https://www.zeroone.it.kr/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZERO ONE IT',
      },
    ],
  },
};

export default async function Landing() {
  return <LandingContent />;
}
