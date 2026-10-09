import type { Meta, StoryObj } from '@storybook/react';
import Image from 'next/image';
import { useState } from 'react';
import { SelectableCard } from '@/components/common/ui/selectable-card';

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

function SelectableCardExample() {
  const [value, setValue] = useState('experience');

  return (
    <div className="w-full p-200 md:p-400">
      <SelectableCard.Group
        label="학습 목표"
        onValueChange={setValue}
        value={value}
      >
        <SelectableCard.Item value="experience">
          <strong className="font-designer-16b">
            내 경험을 정리하고 싶어요
          </strong>
          <span className="font-designer-14r text-text-subtle">
            이미 겪은 일을 질문으로 꺼내 봅니다.
          </span>
        </SelectableCard.Item>
        <SelectableCard.Item value="question">
          <strong className="font-designer-16b">막힌 질문을 풀고 싶어요</strong>
          <span className="font-designer-14r text-text-subtle">
            다른 사람의 경험에서 다음 실마리를 찾습니다.
          </span>
        </SelectableCard.Item>
        <SelectableCard.Item value="practice">
          <strong className="font-designer-16b">
            작은 실천을 시작하고 싶어요
          </strong>
          <span className="font-designer-14r text-text-subtle">
            오늘 바로 해볼 행동 하나를 고릅니다.
          </span>
        </SelectableCard.Item>
      </SelectableCard.Group>
    </div>
  );
}

const meta: Meta<typeof SelectableCard.Group> = {
  component: SelectableCard.Group,
  parameters: {
    viewport: { options: viewportOptions },
  },
  tags: ['autodocs'],
  title: 'Common/UI/SelectableCard',
};

export default meta;
type Story = StoryObj<typeof SelectableCard.Group>;

export const Default: Story = {
  render: () => <SelectableCardExample />,
};

export const InteractionStates: Story = {
  render: () => (
    <div className="w-full p-200 md:p-400">
      <SelectableCard.Group defaultValue="selected" label="선택 카드 상태">
        <SelectableCard.Item value="default">기본</SelectableCard.Item>
        <SelectableCard.Item className="border-border-default" value="hover">
          마우스 올림
        </SelectableCard.Item>
        <SelectableCard.Item
          className="bg-fill-neutral-subtle-pressed"
          value="pressed"
        >
          눌림
        </SelectableCard.Item>
        <SelectableCard.Item className="ring-2 ring-focus-ring" value="focus">
          초점
        </SelectableCard.Item>
        <SelectableCard.Item value="selected">선택됨</SelectableCard.Item>
        <SelectableCard.Item
          disabled
          disabledReason="다음 단계에서 열려요"
          value="disabled"
        >
          비활성
        </SelectableCard.Item>
      </SelectableCard.Group>
    </div>
  ),
};

export const ImageCards: Story = {
  render: () => (
    <div className="w-full p-200 md:p-400">
      <SelectableCard.Group defaultValue="first" label="방 배너 이미지">
        {['first', 'second', 'third'].map((value, index) => (
          <SelectableCard.Item
            key={value}
            media={
              <Image
                alt=""
                className="h-full w-full object-cover"
                height={320}
                src="/profile-default.svg"
                width={320}
              />
            }
            value={value}
          >
            배너 선택지 {index + 1}
          </SelectableCard.Item>
        ))}
      </SelectableCard.Group>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="py-600 text-center" role="status">
      <p className="font-designer-16b text-text-default">
        선택할 카드가 없어요
      </p>
      <p className="font-designer-14r text-text-subtle">
        카드가 등록되면 선택 목록이 나타납니다.
      </p>
    </div>
  ),
};

export const Overflow: Story = {
  render: () => (
    <div className="w-full p-200 md:p-400">
      <p className="pb-200 font-designer-14m text-text-subtle">
        14개 중 첫 12개를 표시합니다.
      </p>
      <SelectableCard.Group defaultValue="item-1" label="과다 데이터 선택">
        {Array.from({ length: 12 }, (_, index) => (
          <SelectableCard.Item key={index} value={`item-${index + 1}`}>
            선택 카드 {index + 1}
          </SelectableCard.Item>
        ))}
      </SelectableCard.Group>
    </div>
  ),
};

export const Mobile390: Story = {
  parameters: { viewport: { defaultViewport: 'mobile390' } },
  render: () => <SelectableCardExample />,
};

export const Tablet768: Story = {
  parameters: { viewport: { defaultViewport: 'tablet768' } },
  render: () => <SelectableCardExample />,
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
  render: () => <SelectableCardExample />,
};
