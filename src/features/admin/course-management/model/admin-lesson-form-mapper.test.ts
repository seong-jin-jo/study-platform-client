import { describe, expect, it } from 'vitest';
import { reconcileDraftImageUrls } from '@/features/admin/course-management/model/admin-lesson-form-mapper';

const HOST = 'https://uploaded-files.acc.r2.cloudflarestorage.com';
const staleUrl = `${HOST}/images/lesson-content/uuid.png?X-Amz-Date=20260612T101759Z&X-Amz-Signature=old`;
const freshUrl = `${HOST}/images/lesson-content/uuid.png?X-Amz-Date=20260614T010000Z&X-Amz-Signature=new`;

describe('reconcileDraftImageUrls', () => {
  it('같은 storage key의 만료 가능 draft 이미지 URL을 서버의 재서명 URL로 교체한다', () => {
    const draft = `<p>가</p><img src="${staleUrl}"><p>나</p>`;
    const server = `<p>서버편집</p><img src="${freshUrl}">`;

    const out = reconcileDraftImageUrls(draft, server);

    expect(out).toContain(freshUrl);
    expect(out).not.toContain(staleUrl);
    expect(out).toContain('<p>가</p>'); // draft 텍스트 편집은 유지
    expect(out).toContain('<p>나</p>');
  });

  it('서버에 없는(아직 저장 안 된) 이미지는 그대로 둔다', () => {
    const newImg = `${HOST}/images/lesson-content/new.png?X-Amz-Signature=x`;
    const draft = `<img src="${newImg}">`;
    const server = `<img src="${freshUrl}">`;

    expect(reconcileDraftImageUrls(draft, server)).toContain(newImg);
  });

  it('이미지가 없거나 draft가 비면 원본을 그대로 반환한다', () => {
    expect(reconcileDraftImageUrls('<p>텍스트</p>', '<p>x</p>')).toBe(
      '<p>텍스트</p>',
    );
    expect(reconcileDraftImageUrls('', `<img src="${freshUrl}">`)).toBe('');
  });
});
