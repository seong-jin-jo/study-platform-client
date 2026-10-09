import type { Meta, StoryObj } from '@storybook/react';
import { Grid2X2, List } from 'lucide-react';
import { useState } from 'react';
import FilterPillButton from './filter-pill-button';
import ViewModeToggle from './view-mode-toggle';

const meta: Meta<typeof FilterPillButton> = {
  title: 'Common/UI/Filters',
  component: FilterPillButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FilterPillButton>;

export const Default: Story = {
  args: { isActive: false, onClick: () => undefined, children: '전체' },
};
export const FilterPillStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-100">
      <FilterPillButton isActive={false} onClick={() => undefined}>
        기본
      </FilterPillButton>
      <FilterPillButton isActive onClick={() => undefined}>
        선택됨
      </FilterPillButton>
      <FilterPillButton disabled isActive={false} onClick={() => undefined}>
        비활성
      </FilterPillButton>
    </div>
  ),
};

function ControlledViewMode() {
  const [value, setValue] = useState<'grid' | 'list'>('grid');
  return (
    <ViewModeToggle<'grid' | 'list'>
      value={value}
      onChange={setValue}
      options={[
        { value: 'grid', title: '격자 보기', icon: <Grid2X2 /> },
        { value: 'list', title: '목록 보기', icon: <List /> },
      ]}
    />
  );
}

export const ViewMode: Story = { render: () => <ControlledViewMode /> };
