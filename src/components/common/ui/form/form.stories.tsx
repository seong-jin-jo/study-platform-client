import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { BaseInput } from '../input';
import FieldErrorText from './field-error-text';
import FormField from './form-field';
import FormSectionCard from './form-section-card';
import LandingForm from './landing-form';
import SelectableTagsInput from './multi-item-selector';

const meta: Meta<typeof FormSectionCard> = {
  title: 'Common/UI/Form',
  component: FormSectionCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormSectionCard>;

export const Default: Story = {
  args: {
    title: '기본 정보',
    description: '스터디 정보를 입력하세요.',
    children: <BaseInput placeholder="스터디 이름" />,
  },
};

interface ExampleValues {
  title: string;
}

function FieldExample({
  direction,
  size,
  error,
}: {
  direction: 'horizontal' | 'vertical';
  size: 'small' | 'medium';
  error?: string;
}) {
  const methods = useForm<ExampleValues>({ defaultValues: { title: '' } });
  useEffect(() => {
    if (error) methods.setError('title', { message: error });
  }, [error, methods]);
  return (
    <FormProvider {...methods}>
      <FormField<ExampleValues, 'title'>
        name="title"
        label="스터디 이름"
        description="20자 이내로 입력하세요."
        required
        direction={direction}
        size={size}
        showCounterRight
        maxCharCount={20}
      >
        <BaseInput maxLength={20} placeholder="아침 독서 스터디" />
      </FormField>
    </FormProvider>
  );
}

export const FieldLayouts: Story = {
  render: () => (
    <div className="grid gap-400">
      <FieldExample direction="horizontal" size="small" />
      <FieldExample direction="vertical" size="medium" />
      <FieldExample
        direction="vertical"
        size="small"
        error="필수 항목입니다."
      />
    </div>
  ),
};
export const ErrorTextStates: Story = {
  render: () => (
    <div>
      <FieldErrorText />
      <FieldErrorText message="입력값을 확인하세요." />
    </div>
  ),
};

function TagsExample({ initial = [] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <SelectableTagsInput
      value={value}
      onChange={setValue}
      options={['React', 'Spring', '디자인', '기획']}
      maxSelectable={4}
      maxCustomLength={12}
    />
  );
}

export const SelectableTags: Story = { render: () => <TagsExample /> };
export const SelectableTagsAtLimit: Story = {
  render: () => <TagsExample initial={['React', 'Spring', '디자인', '기획']} />,
};
export const LandingInquiryForm: Story = { render: () => <LandingForm /> };
