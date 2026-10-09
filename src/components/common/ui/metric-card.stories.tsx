import type { Meta, StoryObj } from '@storybook/react';
import MetricCard from './metric-card';

const meta: Meta<typeof MetricCard> = {
  title: 'Common/UI/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = { args: { label: '연속 학습', value: '12일' } };
export const DashboardMetrics: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-200">
      <MetricCard label="완료한 학습" value="24" />
      <MetricCard label="이번 주 시간" value="8.5h" />
      <MetricCard label="달성률" value="92%" />
    </div>
  ),
};
