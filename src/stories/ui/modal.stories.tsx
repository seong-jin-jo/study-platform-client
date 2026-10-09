import type { Meta, StoryObj } from '@storybook/react';

import { XIcon } from 'lucide-react';
import Button from '@/components/common/ui/button';
import { Modal } from '@/components/common/ui/modal';

const meta: Meta<typeof Modal> = {
  title: 'Common/UI/Modal Trigger Example',
};

export default meta;

type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    return (
      <Modal.Root>
        <Modal.Trigger>Open Modal</Modal.Trigger>
        <Modal.Portal>
          <Modal.Overlay />
          <Modal.Content>
            <Modal.Header className="flex items-center justify-between">
              <Modal.Title>Modal Header</Modal.Title>
              <Modal.Close>
                <XIcon />
              </Modal.Close>
            </Modal.Header>
            <Modal.Body>Modal Body</Modal.Body>
            <Modal.Footer className="flex justify-end">
              <Modal.Close asChild>
                <Button color="secondary" size="small" onClick={() => {}}>
                  확인
                </Button>
              </Modal.Close>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Portal>
      </Modal.Root>
    );
  },
};
