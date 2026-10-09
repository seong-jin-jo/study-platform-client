import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './loading-skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Common/UI/LoadingSkeleton',
  component: Skeleton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = { args: { className: 'h-600 w-full' } };
export const CardLoading: Story = {
  render: () => (
    <div className="grid w-5000 gap-150">
      <Skeleton className="h-300 w-2/5" />
      <Skeleton className="h-200 w-full" />
      <Skeleton className="h-200 w-4/5" />
      <Skeleton className="h-1200 w-full" />
    </div>
  ),
};
