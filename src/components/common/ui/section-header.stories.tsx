import type { Meta, StoryObj } from '@storybook/react';
import { Sparkles } from 'lucide-react';
import Button from './button';
import SectionHeader from './section-header';

const meta: Meta<typeof SectionHeader> = {
  title: 'Common/UI/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = { args: { title: '오늘의 학습' } };
export const WithDescription: Story = {
  args: {
    title: '추천 스터디',
    description: '학습 목표와 관심사를 바탕으로 골랐어요.',
  },
};
export const WithAllSlots: Story = {
  args: {
    title: '새로운 인사이트',
    icon: <Sparkles aria-hidden="true" />,
    description: '이번 주에 추가된 콘텐츠를 확인하세요.',
    rightSlot: (
      <Button size="small" color="secondary">
        더 보기
      </Button>
    ),
  },
};
