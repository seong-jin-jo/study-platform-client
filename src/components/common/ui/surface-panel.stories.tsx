import type { Meta, StoryObj } from '@storybook/react';
import SurfacePanel, {
  SurfacePanelEmpty,
  SurfacePanelHeader,
} from './surface-panel';

const meta: Meta<typeof SurfacePanel> = {
  title: 'Common/UI/SurfacePanel',
  component: SurfacePanel,
  tags: ['autodocs'],
  argTypes: {
    radius: { control: 'select', options: ['sm', 'md', 'lg'] },
    overflow: { control: 'select', options: ['visible', 'hidden'] },
    as: { control: 'select', options: ['div', 'section', 'article'] },
  },
};

export default meta;
type Story = StoryObj<typeof SurfacePanel>;

export const Default: Story = {
  args: { className: 'p-200', children: '기본 패널' },
};
export const RadiusVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-200">
      {(['sm', 'md', 'lg'] as const).map((radius) => (
        <SurfacePanel key={radius} radius={radius} className="p-200">
          {radius}
        </SurfacePanel>
      ))}
    </div>
  ),
};
export const Composed: Story = {
  render: () => (
    <SurfacePanel radius="lg" overflow="hidden" as="article">
      <SurfacePanelHeader>패널 헤더</SurfacePanelHeader>
      <div className="p-200">패널 본문</div>
    </SurfacePanel>
  ),
};
export const Empty: Story = {
  render: () => (
    <SurfacePanel>
      <SurfacePanelEmpty>표시할 데이터가 없습니다.</SurfacePanelEmpty>
    </SurfacePanel>
  ),
};
