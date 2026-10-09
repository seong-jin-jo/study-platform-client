// @vitest-environment jsdom

import { sendGTMEvent } from '@next/third-parties/google';
import userEvent from '@testing-library/user-event';
import { act, createElement, Fragment, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityRoomSummary } from '@/types/community/room-hub';

const testState = vi.hoisted(() => ({
  joined: true,
  reject: false,
  mutateAsync: vi.fn(),
  onJoined: vi.fn(),
}));

vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: Record<string, unknown>) =>
    createElement('img', { ...props, alt }),
}));

vi.mock('@/components/common/ui/button', () => ({
  default: ({
    children,
    color: _color,
    icon,
    size: _size,
    ...props
  }: {
    children: ReactNode;
    color?: string;
    icon?: ReactNode;
    size?: string;
  }) => createElement('button', props, icon, children),
}));

vi.mock('@/components/common/ui/input/text-area', () => ({
  default: (props: Record<string, unknown>) => createElement('textarea', props),
}));

vi.mock('@/components/common/ui/modal', () => ({
  Modal: {
    Root: ({ children }: { children: ReactNode }) =>
      createElement(Fragment, null, children),
    Trigger: ({ children }: { children: ReactNode }) => children,
    Portal: ({ children }: { children: ReactNode }) =>
      createElement(Fragment, null, children),
    Overlay: () => null,
    Content: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
    Header: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
    Title: ({ children }: { children: ReactNode }) =>
      createElement('h2', null, children),
    CloseButton: () => createElement('button', { type: 'button' }, '닫기'),
    Body: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
    Footer: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
    Close: ({ children }: { children: ReactNode }) => children,
  },
}));

vi.mock('@/components/common/ui/selectable-card', () => ({
  SelectableCard: {
    Group: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
    Item: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
  },
}));

vi.mock('@/components/common/ui/text-action-button', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('button', props, children),
}));

vi.mock('@/hooks/queries/community/use-community-room-hub-query', () => ({
  useJoinCommunityRoomMutation: () => ({
    isPending: false,
    mutateAsync: testState.mutateAsync,
  }),
}));

import JoinCommunityRoomModal from './join-community-room-modal';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const room: CommunityRoomSummary = {
  roomId: 42,
  slug: 'deploy-room',
  code: 'DEPLOY',
  name: '배포 공부방',
  description: '배포를 함께 공부합니다.',
  axisTags: [],
  jobAxis: [],
  goalAxis: [],
  levelAxis: [],
  stats: { memberCount: 3, postCount7d: 1, commentCount7d: 2 },
  memberCount: 3,
  newPostsToday: 1,
  liveSignal: true,
  membership: { state: 'NONE', canJoin: true },
  rules: [],
  revision: 1,
};

let container: HTMLDivElement;
let root: Root;
const testDocument = document;
const testWindow = window;

beforeEach(async () => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  testState.mutateAsync.mockImplementation(async () => {
    if (testState.reject) throw new Error('join failed');
    return { joined: testState.joined };
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(JoinCommunityRoomModal, {
        activeRoomCount: 0,
        activeRoomLimit: 3,
        activeRooms: [],
        onJoined: testState.onJoined,
        room,
        trigger: createElement('button', null, '입장하기'),
      }),
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  testState.joined = true;
  testState.reject = false;
});

const submitJoin = async () => {
  const user = userEvent.setup();
  const answer = container.querySelector('textarea');
  const submit = container.querySelector<HTMLButtonElement>(
    '[data-testid="community-room-join-submit"]',
  );
  await act(async () => user.type(answer!, '배포 자동화를 만들고 있습니다.'));
  await act(async () => user.click(submit!));
};

describe('room_join analytics', () => {
  it('sends room_join after the API confirms membership', async () => {
    await submitJoin();

    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'room_join',
      room_id: 42,
      room_name: '배포 공부방',
    });
    expect(testState.onJoined).toHaveBeenCalledOnce();
  });

  it('does not send room_join when the response says no room was joined', async () => {
    testState.joined = false;
    await submitJoin();

    expect(sendGTMEvent).not.toHaveBeenCalled();
  });

  it('does not send room_join when the API rejects', async () => {
    testState.reject = true;
    await submitJoin();

    expect(sendGTMEvent).not.toHaveBeenCalled();
  });
});
