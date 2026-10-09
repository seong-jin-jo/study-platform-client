import type { Meta, StoryObj } from '@storybook/react';
import KeyValueRow from './key-value-row';

const meta: Meta<typeof KeyValueRow> = {
  title: 'Common/UI/KeyValueRow',
  component: KeyValueRow,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof KeyValueRow>;

export const Default: Story = {
  args: { label: '진행 기간', children: '2026.08.01 - 2026.08.31' },
};
export const ValueElements: Story = {
  render: () => (
    <div className="grid gap-200">
      <KeyValueRow label="div" valueAs="div">
        기본 값
      </KeyValueRow>
      <KeyValueRow label="paragraph" valueAs="p">
        문단 값
      </KeyValueRow>
      <KeyValueRow label="inline" valueAs="span">
        인라인 값
      </KeyValueRow>
    </div>
  ),
};
