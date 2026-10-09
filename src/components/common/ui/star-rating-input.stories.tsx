import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import StarRatingInput from './star-rating-input';

const meta: Meta<typeof StarRatingInput> = {
  title: 'Common/UI/StarRatingInput',
  component: StarRatingInput,
  tags: ['autodocs'],
  argTypes: {
    appearance: { control: 'select', options: ['compact', 'lesson'] },
    precision: { control: 'select', options: ['half', 'whole'] },
  },
};

export default meta;
type Story = StoryObj<typeof StarRatingInput>;

function Controlled({
  appearance = 'compact',
  precision = 'half',
  initial = 3.5,
}: {
  appearance?: 'compact' | 'lesson';
  precision?: 'half' | 'whole';
  initial?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <StarRatingInput
      value={value}
      onChange={setValue}
      appearance={appearance}
      precision={precision}
    />
  );
}

export const Default: Story = { render: () => <Controlled /> };
export const Empty: Story = { render: () => <Controlled initial={0} /> };
export const WholeStars: Story = {
  render: () => <Controlled precision="whole" initial={3} />,
};
export const LessonAppearance: Story = {
  render: () => (
    <Controlled appearance="lesson" precision="whole" initial={4} />
  ),
};
