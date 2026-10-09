import type { Meta, StoryObj } from '@storybook/react';
import TabMenu from '.';

const meta: Meta<typeof TabMenu> = {
  title: 'Common/UI/TabMenu',
  component: TabMenu,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TabMenu>;

export const Default: Story = { args: { children: '전체' } };
export const Active: Story = { args: { active: true, children: '진행 중' } };
export const MenuSet: Story = {
  render: () => (
    <div className="grid w-3000 gap-100">
      <TabMenu active>전체</TabMenu>
      <TabMenu>모집 중</TabMenu>
      <TabMenu>종료</TabMenu>
    </div>
  ),
};
