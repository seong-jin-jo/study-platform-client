import type { Meta, StoryObj } from '@storybook/react';
import Tooltip from '.';
import Button from '../button';

const meta: Meta<typeof Tooltip> = {
  title: 'Common/UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    trigger: <Button size="small">도움말</Button>,
    value: '추가 설명입니다.',
    defaultOpen: true,
  },
};
export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-1000 p-1000">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip
          key={side}
          side={side}
          defaultOpen
          delayDuration={0}
          trigger={<Button size="small">{side}</Button>}
          value={`${side} 툴팁`}
        />
      ))}
    </div>
  ),
};
export const AlignmentAndOffset: Story = {
  args: {
    trigger: <Button size="small">정렬 예시</Button>,
    value: 'start 정렬, 12px 간격',
    side: 'bottom',
    align: 'start',
    sideOffset: 12,
    defaultOpen: true,
    avoidCollisions: false,
  },
};
