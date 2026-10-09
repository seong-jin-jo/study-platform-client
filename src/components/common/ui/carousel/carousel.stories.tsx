import type { Meta, StoryObj } from '@storybook/react';
import { Carousel } from '.';

const meta: Meta<typeof Carousel.Root> = {
  title: 'Common/UI/Carousel',
  component: Carousel.Root,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Carousel.Root>;

function Example({ count }: { count: number }) {
  return (
    <Carousel.Root className="w-8000">
      <Carousel.Viewport>
        {Array.from({ length: count }, (_, index) => (
          <Carousel.Slide key={index}>
            <div className="bg-fill-brand-subtle-default flex h-2500 items-center justify-center font-designer-20b text-text-brand">
              슬라이드 {index + 1}
            </div>
          </Carousel.Slide>
        ))}
      </Carousel.Viewport>
      <Carousel.Prev />
      <Carousel.Next />
    </Carousel.Root>
  );
}

export const Default: Story = { render: () => <Example count={3} /> };
export const SingleSlide: Story = { render: () => <Example count={1} /> };
export const ManySlides: Story = { render: () => <Example count={8} /> };
