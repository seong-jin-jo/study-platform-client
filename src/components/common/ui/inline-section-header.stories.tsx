import type { Meta, StoryObj } from '@storybook/react';
import { BookOpen } from 'lucide-react';
import Badge from './badge';
import Button from './button';
import InlineSectionHeader from './inline-section-header';

const meta: Meta<typeof InlineSectionHeader> = {
  title: 'Common/UI/InlineSectionHeader',
  component: InlineSectionHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InlineSectionHeader>;

export const Default: Story = { args: { title: '이번 주 학습' } };
export const WithAllSlots: Story = {
  args: {
    title: '추천 콘텐츠',
    icon: <BookOpen aria-hidden="true" />,
    badge: <Badge>새 글</Badge>,
    rightSlot: (
      <Button size="xsmall" color="secondary">
        전체 보기
      </Button>
    ),
  },
};
