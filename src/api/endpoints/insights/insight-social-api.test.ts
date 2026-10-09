import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosInstance } from '@/api/client/axios';
import {
  addInsightSectionComment,
  asInsightSectionReaction,
  canSubmitInsightSectionComment,
  clampInsightSectionComment,
  findPollOptionIndex,
  formatReactionCountLabel,
  getInsightPoll,
  getInsightSectionReactions,
  getInsightTipSaved,
  INSIGHT_SECTION_COMMENT_LOGIN_PROMPT,
  INSIGHT_SECTION_COMMENT_MAX_LENGTH,
  INSIGHT_SOCIAL_PENDING_LABEL,
  insightPollFooterMessage,
  pollOptionCount,
  pollOptionKey,
  sectionReactionToken,
  setInsightSectionReaction,
  setInsightTipSaved,
  voteInsightPoll,
} from './insight-social-api';

vi.mock('@/api/client/axios', () => ({
  axiosInstance: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/api/endpoints/insights/insight-worldmap-api', () => ({
  getInsightViewerKey: () => 'viewer-key-1',
}));

const mockedGet = vi.mocked(axiosInstance.get);
const mockedPut = vi.mocked(axiosInstance.put);
const mockedPost = vi.mocked(axiosInstance.post);
const mockedDelete = vi.mocked(axiosInstance.delete);

const viewerHeaders = {
  headers: { 'X-Insight-Viewer-Key': 'viewer-key-1' },
};

const SERVER_TOKEN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

describe('insight social key mapping', () => {
  it('sends poll options as o<index> and never the Korean label', () => {
    const label = '본 것 같은데 뭔지 몰랐어요';
    expect(pollOptionKey(label, 0)).toBe('o0');
    expect(pollOptionKey('이미 발급해 봤다', 1)).toBe('o1');
    expect(pollOptionKey('  ', 2)).toBe('o2');
    expect(pollOptionKey(label, 10)).toBe('o10');
    expect(pollOptionKey(label, 0)).not.toBe(label);
    expect(pollOptionKey(label, 0)).toMatch(SERVER_TOKEN);
    expect(pollOptionKey(label, 0).length).toBeLessThanOrEqual(64);
  });

  it('hashes a heading slug to s- plus djb2 32bit hex, stable and ASCII', () => {
    const slug = '왜-api-키가-필요한가';
    expect(sectionReactionToken(slug)).toBe('s-ff21fe1a');
    expect(sectionReactionToken(slug)).toBe(sectionReactionToken(slug));
    expect(sectionReactionToken(`${slug}-2`)).not.toBe(
      sectionReactionToken(slug),
    );
    expect(sectionReactionToken('hello')).toBe('s-0f923099');
    expect(sectionReactionToken('')).toBe('s-00001505');
    const token = sectionReactionToken(slug);
    expect(token).toMatch(/^s-[0-9a-f]{8}$/);
    expect(token).toMatch(SERVER_TOKEN);
    expect(token.length).toBeLessThanOrEqual(64);
    expect(token).not.toContain(slug);
  });

  it('resolves a server o<index> back to the label index, and still reads legacy storage', () => {
    const options = [
      '본 것 같은데 뭔지 몰랐어요',
      '이름만 알아요',
      '처음 봐요',
    ];
    expect(findPollOptionIndex('o0', options)).toBe(0);
    expect(findPollOptionIndex('o2', options)).toBe(2);
    expect(options[findPollOptionIndex('o0', options) ?? -1]).toBe(options[0]);
    expect(findPollOptionIndex('o9', options)).toBeNull();
    expect(findPollOptionIndex('본 것 같은데 뭔지 몰랐어요', options)).toBe(0);
    expect(findPollOptionIndex('0', options)).toBe(0);
    expect(findPollOptionIndex(null, options)).toBeNull();
    expect(findPollOptionIndex('없는 값', options)).toBeNull();
  });
});

describe('insight social helpers', () => {
  it('shows real counts only when a server snapshot exists, never a seeded percent', () => {
    expect(formatReactionCountLabel(null)).toBe(INSIGHT_SOCIAL_PENDING_LABEL);
    expect(formatReactionCountLabel(undefined)).toBe(
      INSIGHT_SOCIAL_PENDING_LABEL,
    );
    expect(formatReactionCountLabel(0)).toBe('0');
    expect(formatReactionCountLabel(12)).toBe('12');
    expect(insightPollFooterMessage(false)).toContain('집계 전');
    expect(insightPollFooterMessage(true)).not.toContain('집계 전');
    expect(insightPollFooterMessage(true)).not.toMatch(/%/);
  });

  it('reads poll option counts from o<index> and does not invent missing ones', () => {
    const snapshot = {
      pollId: 'p1',
      total: 3,
      options: [
        { key: 'o0', count: 2 },
        { key: 'o1', count: 1 },
      ],
      mine: 'o0',
    };
    expect(pollOptionCount(snapshot, '본 것 같은데 뭔지 몰랐어요', 0)).toBe(2);
    expect(pollOptionCount(snapshot, '없는 라벨', 2)).toBeNull();
    expect(pollOptionCount(null, '본 것 같은데 뭔지 몰랐어요', 0)).toBeNull();
    expect(
      pollOptionCount(
        {
          pollId: 'p1',
          total: 4,
          options: [{ key: '예전 라벨', count: 4 }],
          mine: null,
        },
        '예전 라벨',
        0,
      ),
    ).toBe(4);
  });

  it('clamps section comments to 1-120 and blocks guest submit', () => {
    expect(INSIGHT_SECTION_COMMENT_MAX_LENGTH).toBe(120);
    expect(clampInsightSectionComment(`  ${'가'.repeat(130)}  `).length).toBe(
      120,
    );
    expect(canSubmitInsightSectionComment(false, '한 줄')).toBe('guest');
    expect(canSubmitInsightSectionComment(true, '   ')).toBe('empty');
    expect(canSubmitInsightSectionComment(true, '한 줄')).toBe('ok');
    expect(INSIGHT_SECTION_COMMENT_LOGIN_PROMPT).toContain('로그인하면');
    expect(INSIGHT_SECTION_COMMENT_LOGIN_PROMPT).not.toMatch(/잠금|포인트/);
  });

  it('accepts only the contracted reaction keys', () => {
    expect(asInsightSectionReaction('agree')).toBe('agree');
    expect(asInsightSectionReaction('known')).toBe('known');
    expect(asInsightSectionReaction('new')).toBe('new');
    expect(asInsightSectionReaction('좋아요')).toBeNull();
  });
});

describe('insight social api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a poll with the viewer key and unwraps BaseResponse.content', async () => {
    const labels = ['이미 발급해 봤다', '아직이다'];
    const content = {
      pollId: 'poll-1',
      total: 4,
      options: [
        { key: 'o0', count: 3 },
        { key: 'o1', count: 1 },
      ],
      mine: 'o1',
    };
    mockedGet.mockResolvedValue({ data: { content } });

    await expect(getInsightPoll('doc/1', 'poll-1')).resolves.toEqual(content);
    expect(labels[findPollOptionIndex(content.mine, labels) ?? -1]).toBe(
      '아직이다',
    );
    expect(mockedGet).toHaveBeenCalledWith(
      'insight/articles/doc%2F1/polls/poll-1',
      viewerHeaders,
    );
  });

  it('overwrites a poll vote and sends o<index>, not the Korean label', async () => {
    const label = '이미 발급해 봤다';
    const option = pollOptionKey(label, 0);
    const content = {
      pollId: 'poll-1',
      total: 1,
      options: [{ key: 'o0', count: 1 }],
      mine: 'o0',
    };
    mockedPut.mockResolvedValue({ data: { content } });

    await expect(voteInsightPoll('doc-1', 'poll-1', option)).resolves.toEqual(
      content,
    );
    expect(option).toBe('o0');
    expect(mockedPut).toHaveBeenCalledWith(
      'insight/articles/doc-1/polls/poll-1/votes/me',
      { option: 'o0' },
      viewerHeaders,
    );
  });

  it('loads section reactions by the hashed token and posts a member comment of at most 120 chars', async () => {
    const slug = '왜-api-키가-필요한가';
    const sectionId = sectionReactionToken(slug);
    const content = {
      sectionId,
      counts: { agree: 2, known: 1, new: 0 },
      mine: 'agree' as const,
      comments: [
        {
          id: 9,
          nickname: '민수',
          text: '이 절이 핵심이네요',
          createdAt: '2026-09-21T01:00:00+09:00',
        },
      ],
      commentCount: 1,
    };
    mockedGet.mockResolvedValue({ data: { content } });
    mockedPut.mockResolvedValue({ data: { content } });
    mockedPost.mockResolvedValue({ data: { content } });

    await expect(
      getInsightSectionReactions('doc-1', sectionId),
    ).resolves.toEqual(content);
    expect(sectionId).toBe('s-ff21fe1a');
    expect(mockedGet).toHaveBeenCalledWith(
      'insight/articles/doc-1/sections/s-ff21fe1a/reactions',
      viewerHeaders,
    );

    await setInsightSectionReaction('doc-1', sectionId, 'new');
    expect(mockedPut).toHaveBeenCalledWith(
      'insight/articles/doc-1/sections/s-ff21fe1a/reactions/me',
      { reaction: 'new' },
      viewerHeaders,
    );

    await addInsightSectionComment('doc-1', sectionId, `  ${'가'.repeat(130)}`);
    expect(mockedPost).toHaveBeenCalledWith(
      'insight/articles/doc-1/sections/s-ff21fe1a/comments',
      { text: '가'.repeat(120) },
    );
  });

  it('saves and unsaves a tip the same way helpful toggles', async () => {
    mockedGet.mockResolvedValue({ data: { content: { saved: false } } });
    mockedPut.mockResolvedValue({ data: { content: { saved: true } } });
    mockedDelete.mockResolvedValue({ data: { content: { saved: false } } });

    await expect(getInsightTipSaved('doc-1', 'tip-2')).resolves.toEqual({
      saved: false,
    });
    await expect(setInsightTipSaved('doc-1', 'tip-2', true)).resolves.toEqual({
      saved: true,
    });
    await expect(setInsightTipSaved('doc-1', 'tip-2', false)).resolves.toEqual({
      saved: false,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      'insight/articles/doc-1/tips/tip-2/saved/me',
    );
    expect(mockedPut).toHaveBeenCalledWith(
      'insight/articles/doc-1/tips/tip-2/saved/me',
    );
    expect(mockedDelete).toHaveBeenCalledWith(
      'insight/articles/doc-1/tips/tip-2/saved/me',
    );
  });

  it('fails closed when the envelope has no content instead of showing a made-up tally', async () => {
    mockedGet.mockResolvedValue({ data: { content: null } });
    await expect(getInsightPoll('doc-1', 'poll-1')).rejects.toThrow(
      '설문 집계 응답이 없습니다.',
    );
  });

  it('returns null on 404 and network failure so the UI can fall back without console.error', async () => {
    mockedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });
    await expect(getInsightPoll('doc-1', 'poll-1')).resolves.toBeNull();

    mockedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: undefined,
    });
    await expect(
      getInsightSectionReactions('doc-1', 'why-keys'),
    ).resolves.toBeNull();

    mockedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });
    await expect(getInsightTipSaved('doc-1', 'tip-2')).resolves.toBeNull();
  });

  it('still throws on 5xx so a real outage is not painted as an empty tally', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    });
    await expect(getInsightPoll('doc-1', 'poll-1')).rejects.toMatchObject({
      isAxiosError: true,
      response: { status: 500 },
    });
  });
});
