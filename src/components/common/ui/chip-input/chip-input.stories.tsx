import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ChipInput from '.';

const meta: Meta<typeof ChipInput> = {
  title: 'Common/UI/ChipInput',
  component: ChipInput,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChipInput>;

function Controlled({ initial }: { initial: string[] }) {
  const [chips, setChips] = useState(initial);
  return <ChipInput chips={chips} onChange={setChips} />;
}

export const Default: Story = {
  render: () => <Controlled initial={['React', 'TypeScript']} />,
};
export const Empty: Story = { render: () => <Controlled initial={[]} /> };
export const Many: Story = {
  render: () => (
    <Controlled
      initial={['React', 'TypeScript', 'Next.js', 'Storybook', 'Vitest']}
    />
  ),
};
