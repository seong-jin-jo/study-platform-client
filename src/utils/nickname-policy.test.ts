import { describe, expect, it } from 'vitest';
import {
  isValidNicknameFormat,
  normalizeNicknameInput,
} from './nickname-policy';

describe('nickname-policy', () => {
  it('matches the backend nickname contract', () => {
    expect(isValidNicknameFormat('가나다')).toBe(true);
    expect(isValidNicknameFormat('claudepro123')).toBe(true);
    expect(isValidNicknameFormat('가')).toBe(false);
    expect(isValidNicknameFormat('claudepro hi')).toBe(false);
    expect(isValidNicknameFormat('claudepro_hi')).toBe(false);
  });

  it('normalizes provider names into a value the onboarding form can check', () => {
    expect(normalizeNicknameInput('제로원')).toBe('제로원');
    expect(normalizeNicknameInput('claudepro hi')).toBe('claudeprohi');
    expect(normalizeNicknameInput('nick_name!123')).toBe('nickname123');
    expect(normalizeNicknameInput('abcdefghijklmnopqrstuv')).toBe(
      'abcdefghijklmnopqrst',
    );
  });
});
