import type { Meta, StoryObj } from '@storybook/react';
import AvatarStack from './avatar-stack';

const members = [
  { memberId: 1, nickname: '리더 지민', profileImageUrl: '', isLeader: true },
  { memberId: 2, nickname: '민수', profileImageUrl: '', isLeader: false },
  { memberId: 3, nickname: '서연', profileImageUrl: '', isLeader: false },
  { memberId: 4, nickname: '현우', profileImageUrl: '', isLeader: false },
  { memberId: 5, nickname: '하은', profileImageUrl: '', isLeader: false },
  { memberId: 6, nickname: '도윤', profileImageUrl: '', isLeader: false },
];

const meta: Meta<typeof AvatarStack> = {
  title: 'Common/UI/AvatarStack',
  component: AvatarStack,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AvatarStack>;

export const Default: Story = { args: { members: members.slice(0, 3) } };
export const Empty: Story = { args: { members: [] } };
export const SingleLeader: Story = { args: { members: members.slice(0, 1) } };
export const Overflow: Story = {
  args: { members, maxVisible: 3, guideText: '참여 중인 스터디원입니다.' },
};
