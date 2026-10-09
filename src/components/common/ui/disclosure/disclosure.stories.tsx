import type { Meta, StoryObj } from '@storybook/react';
import Button from '@/components/common/ui/button';
import { Disclosure } from '@/components/common/ui/disclosure';

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

function DisclosureExample() {
  return (
    <div className="w-full p-200 md:p-400">
      <Disclosure.Group defaultValue={['first']}>
        <Disclosure.Item value="first">
          <Disclosure.Header>화두는 어떻게 고르나요?</Disclosure.Header>
          <Disclosure.Panel>
            지금 경험과 가장 가까운 질문 하나를 고르면 됩니다.
          </Disclosure.Panel>
        </Disclosure.Item>
        <Disclosure.Item value="second">
          <Disclosure.Header>답은 길게 써야 하나요?</Disclosure.Header>
          <Disclosure.Panel>
            한 문장으로 시작해도 괜찮습니다. 생각이 이어질 때만 덧붙여 주세요.
          </Disclosure.Panel>
        </Disclosure.Item>
      </Disclosure.Group>
    </div>
  );
}

const meta: Meta<typeof Disclosure.Group> = {
  component: Disclosure.Group,
  parameters: {
    viewport: { options: viewportOptions },
  },
  tags: ['autodocs'],
  title: 'Common/UI/Disclosure',
};

export default meta;
type Story = StoryObj<typeof Disclosure.Group>;

export const Default: Story = {
  render: () => <DisclosureExample />,
};

export const InteractionStates: Story = {
  render: () => (
    <div className="w-full p-200 md:p-400">
      <Disclosure.Group
        defaultValue={['default', 'hover', 'pressed', 'focus']}
        variant="dense"
      >
        <Disclosure.Item value="default">
          <Disclosure.Header>기본</Disclosure.Header>
          <Disclosure.Panel>기본 상태 본문</Disclosure.Panel>
        </Disclosure.Item>
        <Disclosure.Item value="hover">
          <Disclosure.Header className="bg-fill-neutral-subtle-hover">
            마우스 올림
          </Disclosure.Header>
          <Disclosure.Panel>마우스 올림 상태 본문</Disclosure.Panel>
        </Disclosure.Item>
        <Disclosure.Item value="pressed">
          <Disclosure.Header className="bg-fill-neutral-subtle-pressed">
            눌림
          </Disclosure.Header>
          <Disclosure.Panel>눌림 상태 본문</Disclosure.Panel>
        </Disclosure.Item>
        <Disclosure.Item value="focus">
          <Disclosure.Header className="ring-2 ring-inset ring-focus-ring">
            초점
          </Disclosure.Header>
          <Disclosure.Panel>초점 상태 본문</Disclosure.Panel>
        </Disclosure.Item>
        <Disclosure.Item
          disabled
          disabledReason="2주차부터 열려요"
          value="disabled"
        >
          <Disclosure.Header>잠긴 챕터</Disclosure.Header>
          <Disclosure.Panel>잠긴 본문</Disclosure.Panel>
        </Disclosure.Item>
      </Disclosure.Group>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="py-600 text-center" role="status">
      <p className="font-designer-16b text-text-default">
        아직 등록된 질문이 없어요
      </p>
      <p className="font-designer-14r text-text-subtle">
        질문이 생기면 이곳에서 바로 확인할 수 있어요.
      </p>
    </div>
  ),
};

export const Overflow: Story = {
  render: () => (
    <div className="w-full p-200 md:p-400">
      <Disclosure.Group variant="dense">
        {Array.from({ length: 20 }, (_, index) => (
          <Disclosure.Item key={index} value={`chapter-${index + 1}`}>
            <Disclosure.Header>챕터 {index + 1}</Disclosure.Header>
            <Disclosure.Panel>챕터 {index + 1}의 학습 내용</Disclosure.Panel>
          </Disclosure.Item>
        ))}
      </Disclosure.Group>
      <div className="flex justify-center pt-200">
        <Button color="outlined" size="large">
          더 보기
        </Button>
      </div>
    </div>
  ),
};

export const Mobile390: Story = {
  parameters: { viewport: { defaultViewport: 'mobile390' } },
  render: () => <DisclosureExample />,
};

export const Tablet768: Story = {
  parameters: { viewport: { defaultViewport: 'tablet768' } },
  render: () => <DisclosureExample />,
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
  render: () => <DisclosureExample />,
};
