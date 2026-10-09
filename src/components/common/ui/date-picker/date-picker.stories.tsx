import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import DatePicker from '.';

const meta: Meta<typeof DatePicker> = {
  title: 'Common/UI/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

function SingleExample({ disabled = false }: { disabled?: boolean }) {
  const [selected, setSelected] = useState<Date>();
  return (
    <DatePicker
      selected={selected}
      onSelect={setSelected}
      placeholder="날짜를 선택하세요"
      disabled={disabled ? (date) => date.getDay() === 0 : undefined}
    />
  );
}

function RangeExample() {
  const [selected, setSelected] = useState<DateRange>();
  return (
    <DatePicker
      mode="range"
      selected={selected}
      onSelect={setSelected}
      placeholder="기간을 선택하세요"
    />
  );
}

export const Default: Story = { render: () => <SingleExample /> };
export const Range: Story = { render: () => <RangeExample /> };
export const DisabledSundays: Story = {
  render: () => <SingleExample disabled />,
};
export const SelectedSingle: Story = {
  args: {
    selected: new Date(2026, 7, 13),
    onSelect: () => undefined,
    placeholder: '날짜를 선택하세요',
  },
};
