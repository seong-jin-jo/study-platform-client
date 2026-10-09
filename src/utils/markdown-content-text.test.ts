import { describe, expect, it } from 'vitest';
import { getRichContentVisibleText } from './markdown-content-text';

describe('getRichContentVisibleText', () => {
  it('removes truncated media tag fragments from previews', () => {
    expect(
      getRichContentVisibleText(
        '123132123123<img src="https://uploaded-files-qa.example.com/images/qna.png',
      ),
    ).toBe('123132123123');
  });

  it('normalizes complete html content', () => {
    expect(
      getRichContentVisibleText(
        '<p>Hello&nbsp;<strong>ZERO-ONE</strong></p><br><p>platform</p>',
      ),
    ).toBe('Hello ZERO-ONE platform');
  });
});
