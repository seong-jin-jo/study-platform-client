export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

const NICKNAME_ALLOWED_CHARS_PATTERN = /[^가-힣a-zA-Z0-9]/g;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,20}$/;

export const normalizeNicknameInput = (value: string) =>
  value
    .replace(NICKNAME_ALLOWED_CHARS_PATTERN, '')
    .slice(0, NICKNAME_MAX_LENGTH);

export const isValidNicknameFormat = (value: string) =>
  NICKNAME_PATTERN.test(value);
