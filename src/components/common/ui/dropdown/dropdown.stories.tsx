import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import MoreMenu from './more-menu';
import MultiDropdown from './multi';
import SingleDropdown from './single';

const options = [
  { label: '프론트엔드', value: 'frontend' },
  { label: '백엔드', value: 'backend' },
  { label: '기획', value: 'planning' },
  { label: '디자인', value: 'design' },
];

const meta: Meta<typeof SingleDropdown> = {
  title: 'Common/UI/Dropdown',
  component: SingleDropdown,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SingleDropdown>;

function ControlledSingle({ size = 'l' }: { size?: 's' | 'm' | 'l' }) {
  const [value, setValue] = useState<string>();
  return (
    <SingleDropdown
      options={options}
      value={value}
      onChange={setValue}
      placeholder="분야를 선택하세요"
      size={size}
    />
  );
}

function ControlledMulti({ initial = [] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return <MultiDropdown options={options} value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <ControlledSingle /> };
export const SingleSizes: Story = {
  render: () => (
    <div className="grid gap-150">
      {(['s', 'm', 'l'] as const).map((size) => (
        <ControlledSingle key={size} size={size} />
      ))}
    </div>
  ),
};
export const SingleStates: Story = {
  render: () => (
    <div className="grid gap-150">
      <SingleDropdown options={options} value="frontend" />
      <SingleDropdown options={options} error placeholder="오류 상태" />
      <SingleDropdown options={options} disabled placeholder="비활성" />
    </div>
  ),
};
export const MultiEmpty: Story = { render: () => <ControlledMulti /> };
export const MultiSelected: Story = {
  render: () => <ControlledMulti initial={['frontend', 'backend']} />,
};
export const MultiAllSelected: Story = {
  render: () => <ControlledMulti initial={options.map((item) => item.value)} />,
};
export const MultiStates: Story = {
  render: () => (
    <div className="grid gap-150">
      <MultiDropdown options={options} error placeholder="오류 상태" />
      <MultiDropdown options={options} disabled placeholder="비활성" />
    </div>
  ),
};
export const MoreMenuDefault: Story = {
  render: () => (
    <MoreMenu
      iconSize={20}
      options={[
        { label: '수정', value: 'edit', onMenuClick: () => undefined },
        { label: '삭제', value: 'delete', onMenuClick: () => undefined },
      ]}
    />
  ),
};
export const MoreMenuEmpty: Story = {
  render: () => <MoreMenu iconSize={20} options={[]} />,
};
