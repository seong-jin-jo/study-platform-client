import Link from 'next/link';

export default function AppintossNotFound() {
  return (
    <main className="mx-auto flex min-h-3000 max-w-page flex-col items-center justify-center px-300 text-center">
      <h1 className="font-designer-30b text-text-strong">
        이 화면은 앱에서 열 수 없어요
      </h1>
      <p className="mt-125 font-designer-16r text-text-subtle">
        공개된 홈, 인사이트, 커뮤니티, 클래스 화면을 이용해 주세요.
      </p>
      <Link
        href="/"
        className="mt-300 inline-flex min-h-550 items-center rounded-150 bg-background-brand-default px-250 font-designer-16b text-text-inverse"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
