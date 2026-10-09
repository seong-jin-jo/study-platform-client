import type { Metadata } from 'next';
import PageClient from './page-client';

export const metadata: Metadata = {
  title: '바이브 코딩 입문자 코스 | ZERO ONE IT',
};

export default function Page() {
  return <PageClient />;
}
