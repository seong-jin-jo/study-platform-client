import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ImageUploadInput from './image-upload-input';

const meta: Meta<typeof ImageUploadInput> = {
  title: 'Common/UI/ImageUploadInput',
  component: ImageUploadInput,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ImageUploadInput>;

function EmptyExample() {
  const [, setFile] = useState<File>();
  return <ImageUploadInput onChangeImage={setFile} />;
}

export const Default: Story = { render: () => <EmptyExample /> };
export const Preview: Story = {
  args: {
    image: '/profile-default.svg',
    onChangeImage: () => undefined,
  },
};
export const OneMegabyteLimit: Story = {
  args: { maxSizeBytes: 1024 * 1024, onChangeImage: () => undefined },
};
