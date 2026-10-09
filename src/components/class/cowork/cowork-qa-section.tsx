'use client';

import { useState } from 'react';
import { Disclosure } from '@/components/common/ui/disclosure';
import { FAQS } from './cowork-content';
import { CoworkSectionHeading } from './cowork-section-heading';

export function CoworkQaSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full bg-white px-300 py-1000 md:py-1500">
      <div className="mx-auto flex max-w-page flex-col items-center gap-600">
        <CoworkSectionHeading
          label="시작하기 전, 마지막으로 궁금한 점들"
          title="궁금한 점 있으세요?"
        />

        <Disclosure.Group
          className="w-full gap-200"
          type="single"
          value={openIndex === null ? [] : [String(openIndex)]}
          onValueChange={(value) =>
            setOpenIndex(value.length === 0 ? null : Number(value[0]))
          }
        >
          {FAQS.map((faq, index) => (
            <Disclosure.Item
              key={faq.q}
              value={String(index)}
              className="rounded-300 border-gray-200"
            >
              <Disclosure.Header className="gap-200 px-400 py-300">
                <span className="text-[15px] font-semibold text-gray-900 md:text-[17px]">
                  {faq.q}
                </span>
              </Disclosure.Header>
              <Disclosure.Panel className="border-gray-100 px-400 py-300 text-[14px] leading-[1.7] text-gray-600 md:text-[15px]">
                {faq.a}
              </Disclosure.Panel>
            </Disclosure.Item>
          ))}
        </Disclosure.Group>
      </div>
    </section>
  );
}
