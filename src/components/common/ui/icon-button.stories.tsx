import type { Meta, StoryObj } from '@storybook/react';
import { Heart, Search } from 'lucide-react';
import IconButton from './icon-button';

const meta: Meta<typeof IconButton> = {
  title: 'Common/UI/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['ghost', 'outline', 'brand'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: { label: '검색', children: <Search aria-hidden="true" /> },
};
export const Tones: Story = {
  render: () => (
    <div className="flex gap-150">
      {(['ghost', 'outline', 'brand'] as const).map((tone) => (
        <IconButton key={tone} label={tone} tone={tone}>
          <Heart aria-hidden="true" />
        </IconButton>
      ))}
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-150">
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <IconButton key={size} label={size} size={size} tone="outline">
          <Search aria-hidden="true" />
        </IconButton>
      ))}
    </div>
  ),
};
export const Disabled: Story = {
  args: { label: '비활성', disabled: true, children: <Search /> },
};
export const Loading: Story = {
  args: { label: '불러오는 중', loading: true, children: <Search /> },
};
export const AsChild: Story = {
  args: {
    asChild: true,
    label: '검색 페이지',
    children: (
      <a href="#search">
        <Search aria-hidden="true" />
      </a>
    ),
  },
};
