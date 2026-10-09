import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Pagination from '@/components/common/ui/pagination';

const viewportOptions = {
  desktop1440: {
    name: 'Desktop 1440',
    styles: { height: '900px', width: '1440px' },
    type: 'desktop',
  },
  mobile390: {
    name: 'Mobile 390',
    styles: { height: '844px', width: '390px' },
    type: 'mobile',
  },
  tablet768: {
    name: 'Tablet 768',
    styles: { height: '1024px', width: '768px' },
    type: 'tablet',
  },
};

function PaginationExample({ totalPages = 12 }: { totalPages?: number }) {
  const [page, setPage] = useState(4);
  return (
    <div className="w-full p-200 md:p-400">
      <Pagination
        onChangePage={setPage}
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
      />
    </div>
  );
}

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  parameters: {
    viewport: { options: viewportOptions },
  },
  tags: ['autodocs'],
  title: 'Common/UI/Pagination',
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => <PaginationExample />,
};

export const FirstPageDisabled: Story = {
  args: {
    onChangePage: () => undefined,
    page: 1,
    totalPages: 12,
  },
};

export const Empty: Story = {
  render: () => (
    <div className="py-600 text-center" role="status">
      <p className="font-designer-16b text-text-default">
        표시할 페이지가 없어요
      </p>
      <p className="font-designer-14r text-text-subtle">
        결과가 생기면 페이지 이동이 나타납니다.
      </p>
    </div>
  ),
};

export const Overflow: Story = {
  render: () => <PaginationExample totalPages={128} />,
};

export const Mobile390: Story = {
  parameters: { viewport: { defaultViewport: 'mobile390' } },
  render: () => <PaginationExample />,
};

export const Tablet768: Story = {
  parameters: { viewport: { defaultViewport: 'tablet768' } },
  render: () => <PaginationExample />,
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
  render: () => <PaginationExample />,
};
