import type { CourseSummaryResponse } from '@/api/openapi';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v5/courses`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const courses: CourseSummaryResponse[] = json?.content?.content ?? [];
    return courses
      .filter((c): c is CourseSummaryResponse & { slug: string } =>
        Boolean(c.slug),
      )
      .map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export default function CourseSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
