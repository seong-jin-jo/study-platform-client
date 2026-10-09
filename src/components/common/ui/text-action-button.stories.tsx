import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight } from 'lucide-react';
import TextActionButton from './text-action-button';

const meta: Meta<typeof TextActionButton> = {
  title: 'Common/UI/TextActionButton',
  component: TextActionButton,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['subtle', 'default'] },
    weight: { control: 'select', options: ['regular', 'bold'] },
    withTransition: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TextActionButton>;

export const Default: Story = { args: { children: '자세히 보기' } };
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-150">
      {(['subtle', 'default'] as const).flatMap((tone) =>
        (['regular', 'bold'] as const).map((weight) => (
          <TextActionButton
            key={`${tone}-${weight}`}
            tone={tone}
            weight={weight}
            withTransition
            icon={<ArrowRight aria-hidden="true" />}
          >
            {tone} {weight}
          </TextActionButton>
        )),
      )}
    </div>
  ),
};
export const Disabled: Story = {
  args: { children: '비활성', disabled: true },
};
