import { Disclosure } from '@/components/common/ui/disclosure';
import { FAQS } from './class-detail-constants';

interface ClassDetailFaqSectionProps {
  expandedFaq: number | null;
  onToggleFaq: (idx: number) => void;
}

export function ClassDetailFaqSection({
  expandedFaq,
  onToggleFaq,
}: ClassDetailFaqSectionProps) {
  const items = FAQS;

  return (
    <section id="faq">
      <h2 className="font-designer-24b text-gray-800">궁금한 점 있으세요?</h2>
      <Disclosure.Group
        className="mt-400 gap-125"
        type="single"
        value={expandedFaq === null ? [] : [String(expandedFaq)]}
        onValueChange={(value) =>
          onToggleFaq(
            value.length === 0 ? (expandedFaq ?? 0) : Number(value[0]),
          )
        }
      >
        {items.map((faq, idx) => (
          <Disclosure.Item
            key={faq.question}
            value={String(idx)}
            className="border-border-default bg-gray-100"
          >
            <Disclosure.Header className="h-800 px-350">
              <span className="flex items-center">
                <span className="mr-125 font-designer-16m text-text-brand">
                  Q
                </span>
                <span className="font-designer-16m text-gray-800">
                  {faq.question}
                </span>
              </span>
            </Disclosure.Header>
            <Disclosure.Panel className="flex items-start gap-250 border-border-default px-350 py-300">
              <span className="font-designer-16m text-gray-500">A</span>
              <span className="font-designer-16r text-gray-800">
                {faq.answer}
              </span>
            </Disclosure.Panel>
          </Disclosure.Item>
        ))}
      </Disclosure.Group>
    </section>
  );
}
