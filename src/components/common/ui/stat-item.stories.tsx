import type { Meta, StoryObj } from '@storybook/react';
import { Eye, Heart } from 'lucide-react';
import StatItem from './stat-item';

const meta: Meta<typeof StatItem> = {
  title: 'Common/UI/StatItem',
  component: StatItem,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatItem>;

export const Default: Story = {
  args: { icon: <Eye aria-hidden="true" />, value: 128 },
};
export const Clickable: Story = {
  args: {
    icon: <Heart aria-hidden="true" />,
    value: 12,
    onClick: () => undefined,
    hoverClassName: 'hover:bg-background-alternative',
  },
};
export const LargeValue: Story = {
  args: { icon: <Eye aria-hidden="true" />, value: '1,234,567' },
};
