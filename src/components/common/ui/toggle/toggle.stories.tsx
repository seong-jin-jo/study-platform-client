import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { GroupItems, ToggleButton, ToggleSwitch } from '.';

const meta: Meta<typeof ToggleSwitch.Root> = {
  title: 'Common/UI/Toggle',
  component: ToggleSwitch.Root,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToggleSwitch.Root>;

function ControlledSwitch({
  size = 'md',
  color = 'primary',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'gray';
}) {
  const [checked, setChecked] = useState(false);
  return (
    <ToggleSwitch.Label>
      <ToggleSwitch.Root
        checked={checked}
        onCheckedChange={setChecked}
        size={size}
        color={color}
      />
      알림 받기
    </ToggleSwitch.Label>
  );
}

export const Default: Story = { render: () => <ControlledSwitch /> };
export const SwitchVariants: Story = {
  render: () => (
    <div className="flex items-center gap-200">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <ControlledSwitch key={size} size={size} />
      ))}
      <ToggleSwitch.Root checked color="gray" size="md" />
      <ToggleSwitch.Root checked disabled size="md" />
    </div>
  ),
};
export const ButtonVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-150">
      {(['sm', 'md', 'lg'] as const).flatMap((size) =>
        (['round', 'square'] as const).flatMap((variant) =>
          (['primary', 'gray'] as const).map((color) => (
            <ToggleButton
              key={`${size}-${variant}-${color}`}
              size={size}
              variant={variant}
              color={color}
              pressed={color === 'primary'}
            >
              {size}
            </ToggleButton>
          )),
        ),
      )}
      <ToggleButton disabled>비활성</ToggleButton>
    </div>
  ),
};

function MultipleGroup() {
  const [value, setValue] = useState<Array<string | number>>(['react']);
  return (
    <GroupItems
      options={[
        { value: 'react', label: 'React' },
        { value: 'spring', label: 'Spring' },
        { value: 'design', label: '디자인' },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

function SingleGroup() {
  const [value, setValue] = useState<string | number>();
  return (
    <GroupItems
      multiple={false}
      allowDeselect
      variant="square"
      options={[
        { value: 'daily', label: '매일' },
        { value: 'weekly', label: '매주' },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

export const Groups: Story = {
  render: () => (
    <div className="grid gap-200">
      <MultipleGroup />
      <SingleGroup />
    </div>
  ),
};
