import type { Metadata } from "next";

// 영문 회사 소개. 해외 프로그램(Claude Startups 등) 심사자가 사업자 실체를 영어로
// 확인할 수 있게 둔다. 2026-10-09 Claude Startups 거절 메일("회사를 확인하지 못함") 대응.
// 백엔드 호출이 없는 정적 페이지다.
export const metadata: Metadata = {
  title: "About | ZERO ONE IT",
  description:
    "ZERO ONE IT (zeroone.it.kr) is a Korean AI-building community and class platform operated by Jeongseong Company.",
  alternates: { canonical: "/about" },
};

const COMPANY_FACTS: ReadonlyArray<readonly [string, string]> = [
  ["Company", "Jeongseong Company (정성컴퍼니)"],
  ["Service", "ZERO ONE IT, https://zeroone.it.kr"],
  ["Founder & CEO", "Seongjin Jo"],
  ["Founded", "November 2025"],
  ["Business registration no.", "798-31-01774 (Republic of Korea)"],
  [
    "Address",
    "Room 203, 620-17 Yeoksam-dong, Gangnam-gu, Seoul, Republic of Korea",
  ],
  ["Contact", "support@zeroone.it.kr"],
];

export default function AboutPage() {
  return (
    <section lang="en" className="mx-auto w-full max-w-3xl px-600 py-1000">
      <h1 className="font-designer-24b text-gray-900">About ZERO ONE IT</h1>
      <p className="font-designer-16r mt-400 leading-7 text-gray-800">
        ZERO ONE IT is a community and class platform for Korean non-developers
        who build software with AI tools. We run hands-on classes on Claude Code
        and Claude Cowork, topic rooms where members ask and answer questions,
        and mentoring for people shipping their first product.
      </p>

      <h2 className="font-designer-20b mt-800 text-gray-900">Company</h2>
      <dl className="mt-400 divide-y divide-gray-300 border-y border-gray-300">
        {COMPANY_FACTS.map(([label, value]) => (
          <div key={label} className="grid gap-100 py-300 sm:grid-cols-3">
            <dt className="font-designer-14b text-gray-700">{label}</dt>
            <dd className="font-designer-14r text-gray-900 sm:col-span-2">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
