import type { Meta, StoryObj } from '@storybook/react';
import OAuthButton from '@/components/common/ui/oauth-button';

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

function ProviderSet() {
  return (
    <div className="flex w-full max-w-6000 flex-col gap-150 p-200">
      <OAuthButton provider="kakao" />
      <OAuthButton provider="google" />
    </div>
  );
}

const meta: Meta<typeof OAuthButton> = {
  component: OAuthButton,
  parameters: {
    viewport: { options: viewportOptions },
  },
  tags: ['autodocs'],
  title: 'Common/UI/OAuthButton',
};

export default meta;
type Story = StoryObj<typeof OAuthButton>;

export const Kakao: Story = {
  args: { provider: 'kakao' },
};

export const Google: Story = {
  args: { provider: 'google' },
};

export const InteractionStates: Story = {
  render: () => (
    <div className="flex w-full max-w-6000 flex-col gap-150 p-200">
      <OAuthButton provider="kakao" />
      <OAuthButton className="opacity-[0.92]" provider="kakao" />
      <OAuthButton className="opacity-[0.85]" provider="kakao" />
      <OAuthButton className="ring-2 ring-focus-ring" provider="kakao" />
      <OAuthButton disabled provider="kakao" />
      <OAuthButton loading provider="kakao" />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="py-600 text-center" role="status">
      <p className="font-designer-16b text-text-default">
        사용할 수 있는 소셜 로그인이 없어요
      </p>
      <p className="font-designer-14r text-text-subtle">
        일반 로그인 경로를 안내해 주세요.
      </p>
    </div>
  ),
};

export const MaximumProviders: Story = {
  render: () => <ProviderSet />,
};

export const Mobile390: Story = {
  parameters: { viewport: { defaultViewport: 'mobile390' } },
  render: () => <ProviderSet />,
};

export const Tablet768: Story = {
  parameters: { viewport: { defaultViewport: 'tablet768' } },
  render: () => <ProviderSet />,
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
  render: () => <ProviderSet />,
};
