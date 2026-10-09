import type { Meta, StoryObj } from '@storybook/react';
import { Modal, type ModalVariant } from '.';
import Button from '../button';

const meta: Meta<typeof Modal> = {
  title: 'Common/UI/Modal',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

function Example({
  variant,
  size = 'small',
  mobileFullscreen = false,
}: {
  variant: ModalVariant;
  size?: 'small' | 'medium' | 'large';
  mobileFullscreen?: boolean;
}) {
  return (
    <Modal.Root defaultOpen>
      <Modal.Trigger>모달 열기</Modal.Trigger>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content
          size={size}
          description="스토리북 모달 예시"
          mobileFullscreen={mobileFullscreen}
        >
          <Modal.Header variant={variant}>
            <Modal.Title>
              {variant === 'alert' ? '삭제 확인' : '정보 입력'}
            </Modal.Title>
            {variant === 'form' && <Modal.CloseButton />}
          </Modal.Header>
          <Modal.Body variant={variant}>
            {variant === 'alert'
              ? '선택한 항목을 삭제할까요?'
              : '폼 모달의 본문 영역입니다.'}
          </Modal.Body>
          <Modal.Footer variant={variant}>
            <Modal.Close asChild>
              <Button color="secondary" size="small">
                취소
              </Button>
            </Modal.Close>
            <Button size="small">확인</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}

export const Default: Story = { render: () => <Example variant="alert" /> };
export const Form: Story = {
  render: () => <Example variant="form" size="medium" />,
};
export const Large: Story = {
  render: () => <Example variant="form" size="large" />,
};
export const MobileFullscreen: Story = {
  render: () => <Example variant="form" mobileFullscreen />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
