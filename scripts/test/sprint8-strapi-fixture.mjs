import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const imagePath = resolve(
  process.cwd(),
  'public/insights/worldmap/isl-deploy.png',
);
/**
 * 본문에 딸리는 미디어 5종(커버·본문 이미지·비디오·아바타·첨부)을 이 서버가 직접 낸다.
 *
 * 종전에는 커버 하나만 있었고, 5종 검사(TC-S8-REG-002)는 dev 실데이터에서 값을 받게 돼
 * 있어 계속 미실시로 남았다. dev CMS 는 운영과 같은 인스턴스라 검사용 글을 발행할 수
 * 없어서 그 값을 채울 수도 없다(2026-08-26 확인). 그래서 검사 대상을 여기로 옮긴다.
 * 파일을 저장소에 넣지 않고 최소 크기 payload 를 메모리에서 낸다.
 */
const MEDIA = {
  '/uploads/body.png': { type: 'image/png', body: null },
  '/uploads/clip.mp4': {
    type: 'video/mp4',
    // ftyp 박스만 있는 최소 MP4. 재생이 목적이 아니라 200 과 content-type 확인이 목적이다.
    body: Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom', 'latin1'),
      Buffer.from([0, 0, 2, 0]),
      Buffer.from('isomiso2', 'latin1'),
    ]),
  },
  '/uploads/notes.pdf': {
    type: 'application/pdf',
    body: Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1'),
  },
};

const article = {
  id: 1,
  documentId: 'dep-doc-1',
  slug: 'dep-article-1',
  title: '배포가 끝났다는 말은 무엇이 끝났다는 뜻인가',
  description: '빌드·전송·전환 셋 중 어디까지가 배포인지부터 가릅니다.',
  category: {
    id: 1,
    documentId: 'cat-dep',
    name: '배포·운영',
    slug: 'dep',
    description: '',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-04',
    publishedAt: '2026-08-04',
  },
  author: {
    id: 1,
    documentId: 'author-zeroone',
    name: 'ZERO-ONE',
    email: 'team@zeroone.it.kr',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-04',
    publishedAt: '2026-08-04',
    avatar: {
      id: 2,
      documentId: 'avatar-1',
      name: 'avatar',
      mime: 'image/png',
      url: '/uploads/cover.png',
    },
  },
  cover: {
    id: 3,
    documentId: 'cover-1',
    name: 'cover',
    mime: 'image/png',
    url: '/uploads/cover.png',
  },
  blocks: [
    {
      __component: 'shared.rich-text',
      body: `<h2>키는 서버가 아니라 계정에 붙는다</h2>
<p>SSH 공개키는 서버 어딘가의 파일 하나에 적힌 글줄이다. 정확히는 접속하려는 계정의 홈 디렉터리 아래 <code>~/.ssh/authorized_keys</code> 안에 한 줄로 들어간다. 서버가 키를 "가지고 있다"기보다, 그 계정이 "이 줄에 적힌 사람은 들여보내라"는 명단을 들고 있다고 보는 편이 정확하다.</p>
<pre>ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... deploy@ci
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... sj@macbook</pre>
<p>명단이므로 줄은 여러 개일 수 있다. 이것이 오늘 화두의 답에 직접 닿는다.</p>
<h2>프로젝트 키와 인스턴스 키가 만나면</h2>
<p>클라우드 콘솔에서 키를 등록하는 자리가 두 곳이면, 대개 하나는 프로젝트 전체에 적용되고 하나는 그 인스턴스에만 적용된다. 둘 다 결국 같은 <code>authorized_keys</code>로 합쳐지므로 <b>기본 동작은 공존이다.</b></p>
<div class="note">다만 인스턴스 쪽에 "프로젝트 키 차단" 옵션이 켜져 있으면 그때는 덮어쓰기처럼 보인다. 정확히는 덮어쓴 것이 아니라 프로젝트 키를 명단에 넣지 않은 것이다.</div>
<h2>그래서 무엇을 확인해야 하나</h2>
<p>키를 더했는데 못 들어가면 콘솔 화면을 다시 보기 전에 서버에서 명단부터 읽는다. 파일에 줄이 있는데도 거절당한다면 권한 문제다. <code>.ssh</code>는 700, <code>authorized_keys</code>는 600이어야 한다. 이 두 숫자에서 막히는 경우가 실제로 가장 많다.</p>
<p>명단에 줄이 아예 없다면 등록이 전파되지 않은 것이고, 그때는 차단 옵션을 본다.</p>
<figure><img src="/uploads/body.png" alt="authorized_keys 파일 구조" /></figure>
<p><a href="/uploads/notes.pdf">확인 절차 요약 (PDF)</a></p>`,
    },
    {
      // 비디오는 본문 HTML 의 <video> 가 아니라 media 블록으로 들어온다.
      // 제품 렌더러(blog-detail-page.tsx 의 media 분기)가 mime 이나 확장자를 보고
      // <video><source src=...></video> 를 그린다. 픽스처도 그 경로를 그대로 따른다
      // (2026-08-26: 본문에 raw <video> 를 넣었더니 화면에 안 붙어서 바로잡음).
      __component: 'shared.media',
      file: {
        id: 4,
        documentId: 'clip-1',
        name: 'clip',
        mime: 'video/mp4',
        url: '/uploads/clip.mp4',
      },
    },
  ],
  createdAt: '2026-08-01',
  updatedAt: '2026-08-04',
  publishedAt: '2026-08-04',
};
const lockedArticle = {
  ...article,
  id: 2,
  documentId: 'dep-doc-2',
  slug: 'dep-article-2',
  title: '빌드 산출물은 어디에 남고 언제 지워지는가',
  description: '캐시가 부풀어 디스크를 먹는 사고의 출발점.',
  blocks: [
    { __component: 'shared.rich-text', body: 'LOCKED_CANARY_9f31 비공개 원문' },
  ],
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const media = MEDIA[url.pathname];
  if (media) {
    res.writeHead(200, {
      'Content-Type': media.type,
      'Cache-Control': 'public, max-age=60',
    });
    if (media.body) return res.end(media.body);
    return createReadStream(imagePath).pipe(res);
  }
  if (url.pathname === '/uploads/cover.png') {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=60',
    });
    return createReadStream(imagePath).pipe(res);
  }
  if (url.pathname === '/api/articles') {
    if (req.headers.authorization !== 'Bearer fixture-token') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'server token required' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        data: [article, lockedArticle],
        meta: { pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 } },
      }),
    );
  }
  res.writeHead(404).end();
}).listen(3212, '127.0.0.1', () =>
  process.stdout.write('SPRINT8 Strapi fixture listening on 3212\n'),
);
