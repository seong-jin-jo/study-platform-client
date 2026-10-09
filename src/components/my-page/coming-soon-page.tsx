import { Hammer } from 'lucide-react';
import Link from 'next/link';

interface ComingSoonPageProps {
  title: string;
}

export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-5000 flex-col items-center justify-center rounded-200 border border-border-subtle bg-background-default px-400 py-600 text-center">
      <span className="flex size-700 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <Hammer aria-hidden="true" size={28} />
      </span>
      <h1 className="mt-300 font-designer-20b text-text-strong">
        {title}은 준비 중이에요
      </h1>
      <p className="mt-100 font-designer-14r text-text-subtle">
        지금은 사람들이 답을 주고받는 공부방을 먼저 만들고 있어요.
      </p>
      <Link
        href="/community"
        className="mt-300 flex min-h-550 items-center rounded-100 bg-fill-brand-default-default px-300 font-designer-14b text-text-inverse"
      >
        공부방 둘러보기
      </Link>
    </div>
  );
}
