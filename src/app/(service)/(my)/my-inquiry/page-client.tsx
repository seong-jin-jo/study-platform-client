'use client';

import { PenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Disclosure } from '@/components/common/ui/disclosure';
import {
  useGetMyOneToOneInquiries,
  useGetMyOneToOneInquiryDetail,
  type OneToOneInquiryListItem,
} from '@/hooks/queries/my-inquiry/inquiry-queries';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACCEPTED: {
    label: '답변 대기',
    className: 'bg-gray-100 text-text-subtle',
  },
  ANSWER_COMPLETED: {
    label: '답변 완료',
    className: 'bg-rose-50 text-rose-500 border border-rose-200',
  },
};

const DEFAULT_STATUS = {
  label: '처리 중',
  className: 'bg-gray-100 text-text-subtle',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function MyInquiryPage() {
  const router = useRouter();
  const { data: inquiries, isLoading, isError } = useGetMyOneToOneInquiries();

  return (
    <div className="flex flex-col gap-500">
      <div className="flex items-center justify-between">
        <h1 className="font-designer-24b text-text-default">1:1 문의</h1>
        <Button
          type="button"
          color="primary"
          size="large"
          onClick={() => router.push('/my-inquiry/write')}
          className="h-auto px-300 py-150 font-designer-14m"
        >
          <span className="flex items-center gap-100">
            <PenLine size={16} />
            문의글 작성하기
          </span>
        </Button>
      </div>

      {/* 안내 박스 */}
      <div className="rounded-200 bg-gray-50 p-300">
        <p className="font-designer-14r text-text-subtle">
          • 문의는 3 영업일 이내 답변드려요.
        </p>
        <p className="font-designer-14r text-text-subtle">
          • 결제 관련 문의는 결제 관리 페이지에서 직접 요청해 주세요.
        </p>
        <p className="font-designer-14r text-text-subtle">
          • 욕설, 비방 등 부적절한 내용은 처리가 지연될 수 있습니다.
        </p>
      </div>

      {/* 문의 목록 */}
      {isError ? (
        <div className="flex items-center justify-center py-600">
          <p className="font-designer-14r text-text-subtle">
            문의 내역을 불러오지 못했습니다.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-600">
          <p className="font-designer-14r text-text-subtle">불러오는 중...</p>
        </div>
      ) : !inquiries || inquiries.length === 0 ? (
        <div className="flex flex-col items-center gap-200 py-600">
          <p className="font-designer-16b text-text-default">
            아직 작성한 문의가 없어요
          </p>
          <p className="font-designer-14r text-text-subtle">
            궁금한 점이 있으시면 문의해 주세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-200">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.oneToOneInquiryId} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: OneToOneInquiryListItem }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail, isLoading: detailLoading } =
    useGetMyOneToOneInquiryDetail(expanded ? inquiry.oneToOneInquiryId : null);

  const status = STATUS_CONFIG[inquiry.inquiryStatus] ?? DEFAULT_STATUS;

  return (
    <Disclosure.Group
      type="single"
      value={expanded ? ['inquiry'] : []}
      onValueChange={(value) => setExpanded(value.includes('inquiry'))}
    >
      <Disclosure.Item value="inquiry">
        <Disclosure.Header className="items-start p-300">
          <span className="flex flex-col gap-100">
            <span className="font-designer-14b text-text-default line-clamp-2">
              {inquiry.inquiryPreviewText}
            </span>
            <span className="flex items-center gap-200">
              <span
                className={cn(
                  'rounded-50 px-150 py-50 font-designer-12r',
                  status.className,
                )}
              >
                {status.label}
              </span>
              <span className="font-designer-12r text-text-subtlest">
                {formatDate(inquiry.createdAt)}
              </span>
            </span>
          </span>
        </Disclosure.Header>

        <Disclosure.Panel className="flex flex-col gap-300 p-300">
          {detailLoading ? (
            <p className="font-designer-14r text-text-subtle">불러오는 중...</p>
          ) : detail ? (
            <>
              <div className="flex flex-col gap-100">
                <span className="font-designer-12b text-text-brand">
                  문의 내용
                </span>
                <p className="font-designer-14r text-text-default">
                  {detail.inquiryContent}
                </p>
              </div>

              {detail.replies.length > 0 && (
                <div className="flex flex-col gap-200">
                  {detail.replies.map((reply) => (
                    <div
                      key={reply.oneToOneInquiryReplyId}
                      className="flex flex-col gap-100"
                    >
                      <span className="font-designer-12b text-rose-500">
                        답변 내용
                      </span>
                      <p className="font-designer-14r text-text-default">
                        {reply.replyContent}
                      </p>
                      <p className="font-designer-12r text-text-subtlest">
                        {formatDate(reply.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </Disclosure.Panel>
      </Disclosure.Item>
    </Disclosure.Group>
  );
}
