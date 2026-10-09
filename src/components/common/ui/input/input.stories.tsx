import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BaseInput, NativeSelect, TextAreaInput } from '.';
import BorderedTextarea from './bordered-textarea';

const meta: Meta<typeof BaseInput> = {
  title: 'Common/UI/Input',
  component: BaseInput,
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'select', options: ['default', 'error', 'success'] },
    size: { control: 'select', options: ['m', 'l'] },
    appearance: { control: 'select', options: ['boxed', 'bare'] },
  },
};

export default meta;
type Story = StoryObj<typeof BaseInput>;

export const Default: Story = { args: { placeholder: '내용을 입력하세요' } };
export const BaseInputVariants: Story = {
  render: () => (
    <div className="grid gap-150">
      <BaseInput size="m" placeholder="Medium" />
      <BaseInput size="l" placeholder="Large" />
      <BaseInput color="error" defaultValue="오류 상태" />
      <BaseInput color="success" defaultValue="성공 상태" />
      <BaseInput appearance="bare" defaultValue="Bare appearance" />
      <BaseInput disabled defaultValue="비활성" />
      <BaseInput
        defaultValue="글자 수"
        maxLength={20}
        hideMeta={false}
        guideText="최대 20자"
      />
    </div>
  ),
};

function ControlledTextArea() {
  const [value, setValue] = useState('현재 입력된 내용');
  return (
    <TextAreaInput
      value={value}
      onChange={(event) => setValue(event.target.value)}
      guideText="설명을 입력하세요"
      maxLength={30}
    />
  );
}

export const Textareas: Story = {
  render: () => (
    <div className="grid gap-150">
      <ControlledTextArea />
      <TextAreaInput value="비활성" disabled />
      <BorderedTextarea placeholder="긴 내용을 입력하세요" />
      <BorderedTextarea disabled value="비활성 긴 글 입력" readOnly />
    </div>
  ),
};
export const NativeSelectVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-150">
      {(['sm', 'md'] as const).flatMap((scale) =>
        (['default', 'subtle'] as const).map((tone) => (
          <NativeSelect key={`${scale}-${tone}`} scale={scale} tone={tone}>
            <option>{`${scale} ${tone}`}</option>
            <option>두 번째 옵션</option>
          </NativeSelect>
        )),
      )}
      <NativeSelect disabled>
        <option>비활성</option>
      </NativeSelect>
    </div>
  ),
};
