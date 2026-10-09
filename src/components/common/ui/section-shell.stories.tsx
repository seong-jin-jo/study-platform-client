import type { Meta, StoryObj } from '@storybook/react';
import SectionHeader from './section-header';
import SectionShell from './section-shell';
import SurfacePanel from './surface-panel';

const meta: Meta<typeof SectionShell> = {
  title: 'Common/UI/SectionShell',
  component: SectionShell,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SectionShell>;

export const Default: Story = {
  args: {
    children: (
      <>
        <SectionHeader title="학습 현황" description="섹션 설명입니다." />
        <SurfacePanel className="p-200">섹션 본문 패널</SurfacePanel>
      </>
    ),
  },
};
export const MultipleBlocks: Story = {
  render: () => (
    <SectionShell>
      {['첫 번째 블록', '두 번째 블록', '세 번째 블록'].map((label) => (
        <SurfacePanel key={label} className="p-200">
          {label}
        </SurfacePanel>
      ))}
    </SectionShell>
  ),
};
