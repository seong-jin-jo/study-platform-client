import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Tabs, { type TabItem } from '.';

const tabs: TabItem[] = [
  {
    label: '개요',
    value: 'overview',
    panel: <div className="p-200">개요 내용</div>,
  },
  {
    label: '커리큘럼',
    value: 'curriculum',
    panel: <div className="p-200">커리큘럼 내용</div>,
  },
  {
    label: '수료 기록',
    value: 'history',
    locked: true,
    lockedTooltip: '수료 후 확인할 수 있어요.',
    panel: <div className="p-200">수료 기록</div>,
  },
];

const meta: Meta<typeof Tabs> = {
  title: 'Common/UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

function Controlled({ initial = 'overview' }: { initial?: string }) {
  const [activeTab, setActiveTab] = useState(initial);
  return <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />;
}

export const Default: Story = { render: () => <Controlled /> };
export const SelectedSecond: Story = {
  render: () => <Controlled initial="curriculum" />,
};
export const Locked: Story = {
  args: { tabs, activeTab: 'overview', onChange: () => undefined },
};
export const Empty: Story = {
  args: { tabs: [], activeTab: '', onChange: () => undefined },
};
