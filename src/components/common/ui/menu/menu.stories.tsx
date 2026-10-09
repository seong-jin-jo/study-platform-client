import type { Meta, StoryObj } from '@storybook/react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/common/ui/button';
import { Menu } from '@/components/common/ui/menu';

const viewportOptions = {
  desktop1440: {
    name: 'Desktop 1440',
    styles: { height: '900px', width: '1440px' },
    type: 'desktop',
  },
  mobile390: {
    name: 'Mobile 390',
    styles: { height: '844px', width: '390px' },
    type: 'mobile',
  },
  tablet768: {
    name: 'Tablet 768',
    styles: { height: '1024px', width: '768px' },
    type: 'tablet',
  },
};

function MenuExample({ mobileSheet = false }: { mobileSheet?: boolean }) {
  const [sort, setSort] = useState('recent');

  return (
    <div className="flex min-h-4000 items-start justify-center p-400">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button
            className="group"
            color="outlined"
            icon={
              <ChevronDown className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
            }
            iconPosition="right"
            size="large"
          >
            정렬
          </Button>
        </Menu.Trigger>
        <Menu.Content mobileSheet={mobileSheet}>
          <Menu.Label>게시글 정렬</Menu.Label>
          <Menu.RadioGroup onValueChange={setSort} value={sort}>
            <Menu.RadioItem value="recent">최신순</Menu.RadioItem>
            <Menu.RadioItem value="helpful">도움됨순</Menu.RadioItem>
          </Menu.RadioGroup>
          <Menu.Separator />
          <Menu.Item icon={<Pencil aria-hidden="true" className="size-200" />}>
            수정하기
          </Menu.Item>
          <Menu.Item
            icon={<Trash2 aria-hidden="true" className="size-200" />}
            tone="danger"
          >
            삭제하기
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </div>
  );
}

const meta: Meta<typeof Menu.Root> = {
  component: Menu.Root,
  parameters: {
    viewport: { options: viewportOptions },
  },
  tags: ['autodocs'],
  title: 'Common/UI/Menu',
};

export default meta;
type Story = StoryObj<typeof Menu.Root>;

export const Default: Story = {
  render: () => <MenuExample />,
};

export const InteractionStates: Story = {
  render: () => (
    <div className="flex min-h-4000 items-start justify-center p-400">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button color="outlined" size="large">
            상태 확인
          </Button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item>기본</Menu.Item>
          <Menu.Item className="bg-fill-neutral-subtle-hover">
            마우스 올림
          </Menu.Item>
          <Menu.Item className="bg-fill-neutral-subtle-pressed">눌림</Menu.Item>
          <Menu.Item className="ring-2 ring-inset ring-focus-ring">
            초점
          </Menu.Item>
          <Menu.Item disabled disabledReason="권한이 없어요">
            비활성
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <Button color="outlined" disabled size="large" title="메뉴 항목이 없습니다">
      등록된 항목이 없어요
    </Button>
  ),
};

export const Overflow: Story = {
  render: () => (
    <div className="flex min-h-4000 items-start justify-center p-400">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button color="outlined" size="large">
            레슨 30개
          </Button>
        </Menu.Trigger>
        <Menu.Content mobileSheet>
          {Array.from({ length: 30 }, (_, index) => (
            <Menu.Item key={index}>레슨 {index + 1}</Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    </div>
  ),
};

export const Mobile390: Story = {
  parameters: { viewport: { defaultViewport: 'mobile390' } },
  render: () => <MenuExample mobileSheet />,
};

export const Tablet768: Story = {
  parameters: { viewport: { defaultViewport: 'tablet768' } },
  render: () => <MenuExample />,
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
  render: () => <MenuExample />,
};
