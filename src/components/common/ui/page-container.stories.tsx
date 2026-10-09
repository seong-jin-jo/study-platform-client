import type { Meta, StoryObj } from '@storybook/react';
import PageContainer from './page-container';

const meta: Meta<typeof PageContainer> = {
  title: 'Common/UI/PageContainer',
  component: PageContainer,
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['content', 'fallback', 'registration'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PageContainer>;

export const Default: Story = {
  args: { spacing: 'content', children: '콘텐츠 페이지 컨테이너' },
};
export const SpacingVariants: Story = {
  render: () => (
    <div className="grid gap-200">
      {(['content', 'fallback', 'registration'] as const).map((spacing) => (
        <PageContainer
          key={spacing}
          spacing={spacing}
          className="bg-background-alternative"
        >
          {spacing}
        </PageContainer>
      ))}
    </div>
  ),
};
