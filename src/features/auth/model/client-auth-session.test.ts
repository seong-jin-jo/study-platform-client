import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import {
  clearClientSession,
  hasClientSessionConfirmedAnonymous,
  markClientSessionConfirmedAnonymous,
  markClientSessionEverAuthenticated,
  readClientAuthGeneration,
  writeExistingMemberSession,
} from './client-auth-session';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

const { deleteCookie, setCookie, notifyAuthSessionChanged, decodeJwt } =
  vi.hoisted(() => ({
    deleteCookie: vi.fn(),
    setCookie: vi.fn(),
    notifyAuthSessionChanged: vi.fn(),
    decodeJwt: vi.fn(),
  }));

vi.mock('@/api/client/cookie', () => ({
  deleteCookie,
  setCookie,
}));

vi.mock('./client-auth-sync', () => ({
  notifyAuthSessionChanged,
}));

vi.mock('@/utils/jwt', () => ({
  decodeJwt,
}));

describe('writeExistingMemberSession', () => {
  it('returns false and clears the partial client session when token/member mismatch happens', () => {
    decodeJwt.mockReturnValue({
      memberId: 999,
    });

    expect(
      writeExistingMemberSession({
        accessToken: 'token',
        memberId: '123',
      }),
    ).toBe(false);

    expect(deleteCookie).toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('returns true only after writing token-backed cookies for a valid member session', () => {
    decodeJwt.mockReturnValue({
      memberId: 123,
    });

    expect(
      writeExistingMemberSession({
        accessToken: 'token',
        memberId: '123',
      }),
    ).toBe(true);

    expect(setCookie).toHaveBeenCalledTimes(2);
    expect(notifyAuthSessionChanged).toHaveBeenCalledTimes(1);
  });
});

describe('clearClientSession', () => {
  it('removes auth cookies and notifies auth sync listeners', () => {
    clearClientSession();

    expect(deleteCookie).toHaveBeenCalledTimes(3);
    expect(notifyAuthSessionChanged).toHaveBeenCalledTimes(1);
  });
});

describe('hasClientSessionConfirmedAnonymous', () => {
  it('returns false when storage access throws (unknown must not read as confirmed anonymous)', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://test.zeroone.it.kr',
    });
    vi.stubGlobal('window', dom.window);

    const getItemSpy = vi
      .spyOn(dom.window.localStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });

    expect(hasClientSessionConfirmedAnonymous()).toBe(false);

    getItemSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('returns true only after markClientSessionConfirmedAnonymous has run', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://test.zeroone.it.kr',
    });
    vi.stubGlobal('window', dom.window);

    expect(hasClientSessionConfirmedAnonymous()).toBe(false);

    markClientSessionConfirmedAnonymous();

    expect(hasClientSessionConfirmedAnonymous()).toBe(true);

    vi.unstubAllGlobals();
  });
});

describe('markClientSessionEverAuthenticated (차단결함1 회귀)', () => {
  it('clears a stale confirmed-anonymous marker even when the EVER setItem throws', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://test.zeroone.it.kr',
    });
    vi.stubGlobal('window', dom.window);

    // confirmed-anonymous 마커가 이미 있는 상태를 재현한다.
    markClientSessionConfirmedAnonymous();
    expect(hasClientSessionConfirmedAnonymous()).toBe(true);

    // storage 용량 초과 등으로 EVER 마커 쓰기만 실패하는 상황을 재현한다.
    const setItemSpy = vi
      .spyOn(dom.window.localStorage, 'setItem')
      .mockImplementation((key: string) => {
        if (key === 'zeroone-ever-authenticated') {
          throw new Error('quota exceeded');
        }
      });

    expect(() => markClientSessionEverAuthenticated()).not.toThrow();

    // EVER setItem 이 실패해도, 같은 try 블록에 묶여 있지 않으므로
    // confirmed-anonymous 마커는 반드시 지워져야 한다(로그인 유지).
    expect(hasClientSessionConfirmedAnonymous()).toBe(false);

    setItemSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('readClientAuthGeneration', () => {
  it('increments every time a session write succeeds (writeExistingMemberSession)', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://test.zeroone.it.kr',
    });
    vi.stubGlobal('window', dom.window);
    decodeJwt.mockReturnValue({ memberId: 123 });

    const before = readClientAuthGeneration();

    expect(
      writeExistingMemberSession({ accessToken: 'token', memberId: '123' }),
    ).toBe(true);

    expect(readClientAuthGeneration()).toBe(before + 1);

    vi.unstubAllGlobals();
  });
});
