import type { Meta, StoryObj } from '@storybook/react';
import Chip from '.';
import ChipButton from './chip-button';

const meta: Meta<typeof Chip> = {
  title: 'Common/UI/Chip',
  component: Chip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = { args: { text: '프론트엔드' } };
export const Active: Story = { args: { text: '선택됨', isActive: true } };
export const Closable: Story = {
  args: { text: '삭제 가능', onClose: () => undefined },
};
export const ChipButtonVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-100">
      <ChipButton variant="preset">Preset</ChipButton>
      <ChipButton variant="state">State</ChipButton>
      <ChipButton variant="state" active>
        Active
      </ChipButton>
      <ChipButton variant="state" disabled>
        Disabled
      </ChipButton>
    </div>
  ),
};
