import type { Meta, StoryObj } from '@storybook/react';
import Toast from './toast';

const meta: Meta<typeof Toast> = {
  title: 'Common/UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: {
    isVisible: true,
    onClose: () => undefined,
    duration: 600000,
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  args: { message: '저장되었습니다.', variant: 'success' },
};
export const Error: Story = {
  args: { message: '저장하지 못했습니다.', variant: 'error' },
};
export const Info: Story = {
  args: { message: '새로운 알림이 있습니다.', variant: 'info' },
};
export const Hidden: Story = {
  args: { message: '보이지 않는 알림', isVisible: false },
};
