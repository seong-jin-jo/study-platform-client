import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, request as requestHttp } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const contractPath = path.resolve(
  'deploy/nginx/sprint8-public-seo-errors.conf',
);
const contract = await readFile(contractPath, 'utf8');
const productionEmptyErrorPath = path.resolve('deploy/nginx/400.txt');
const productionEmptyError = await readFile(productionEmptyErrorPath);
assert.equal(
  productionEmptyError.byteLength,
  0,
  'production Nginx 400 response file must remain empty',
);
const productionUnavailablePath = path.resolve('deploy/nginx/503.txt');
const productionUnavailable = await readFile(productionUnavailablePath, 'utf8');
for (const safeRecoveryFragment of [
  '글을 잠시 불러오지 못했습니다',
  '이 글 다시 시도',
  'href="/insights"',
  'noindex,nofollow',
]) {
  assert.ok(
    productionUnavailable.includes(safeRecoveryFragment),
    `production Nginx 503 safe screen is missing: ${safeRecoveryFragment}`,
  );
}

const requiredFragments = [
  'proxy_intercept_errors on;',
  'error_page 500 502 503 504 =503 @zeroone_public_seo_503;',
  'location @zeroone_public_seo_503',
  'add_header Cache-Control "no-store" always;',
  'add_header Retry-After "60" always;',
  'add_header X-Robots-Tag "noindex, nofollow" always;',
  `add_header X-App-Version "\${APP_RELEASE}" always;`,
  `add_header X-App-Commit "\${APP_COMMIT}" always;`,
  'try_files /503.txt =503;',
  'server_tokens off;',
  'error_page 418 =400 @zeroone_invalid_request;',
  'location @zeroone_invalid_request',
];

for (const fragment of requiredFragments) {
  assert.ok(
    contract.includes(fragment),
    `missing ingress contract: ${fragment}`,
  );
}

const dynamicLocation = contract.match(/location ~ "([^"]+)" \{/u)?.[1];
assert.ok(dynamicLocation, 'public SEO location matcher is missing');
const publicSeoMatcher = new RegExp(dynamicLocation);
for (const pathname of [
  '/home',
  '/insights',
  '/insights/clean-architecture',
  '/insights/DDD_개론',
  '/insights/land/database',
  '/insights/koans',
  '/insights/koans/7',
  '/community',
  '/community/17',
  '/community/questions/101',
  '/community/rooms/8',
  '/members/123e4567-e89b-42d3-a456-426614174000',
]) {
  assert.ok(
    publicSeoMatcher.test(pathname),
    `public SEO path is not adapted: ${pathname}`,
  );
}
for (const pathname of [
  '/api/v1/insight/map',
  '/admin',
  '/community/rooms/8/settings',
  '/insights/weekly/archive',
  '/members/not-a-uuid',
]) {
  assert.equal(
    publicSeoMatcher.test(pathname),
    false,
    `non-public path is intercepted: ${pathname}`,
  );
}

const mutations = [
  contract.replaceAll(
    'proxy_intercept_errors on;',
    'proxy_intercept_errors off;',
  ),
  contract.replaceAll('add_header Retry-After "60" always;', ''),
  contract.replaceAll(
    'add_header X-Robots-Tag "noindex, nofollow" always;',
    '',
  ),
  contract.replaceAll('try_files /503.txt =503;', 'return 200 "stale shell";'),
];
for (const mutation of mutations) {
  assert.ok(
    requiredFragments.some((fragment) => !mutation.includes(fragment)),
    'negative mutation unexpectedly preserves the contract',
  );
}

assert.equal(
  contract.includes('proxy_hide_header X-App-Version;'),
  false,
  'Nginx must pass through the X-App-Version header emitted by Next',
);
assert.equal(
  contract.includes('proxy_hide_header X-App-Commit;'),
  false,
  'Nginx must pass through the X-App-Commit header emitted by Next',
);
assert.equal(
  contract.match(/add_header X-App-Version/gu)?.length,
  2,
  'only Nginx-owned 400 and 503 responses may add X-App-Version',
);
assert.equal(
  contract.match(/add_header X-App-Commit/gu)?.length,
  2,
  'only Nginx-owned 400 and 503 responses may add X-App-Commit',
);

const docker = spawnSync('docker', ['version'], { encoding: 'utf8' });
if (docker.status !== 0) {
  throw new Error('Docker is required for the Nginx syntax contract test');
}

const scratch = await mkdtemp(path.join(tmpdir(), 'zeroone-nginx-'));
const wrapperPath = path.join(scratch, 'nginx.conf');
const templatePath = path.join(
  scratch,
  'sprint8-public-seo-errors.conf.template',
);

const requestRawPath = (pathname, port = 33391) =>
  new Promise((resolve, reject) => {
    const request = requestHttp(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: pathname,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({
            body,
            headers: response.headers,
            status: response.statusCode,
          });
        });
      },
    );
    request.once('error', reject);
    request.end();
  });
await writeFile(templatePath, contract);

const productionConfig = await readFile(
  path.resolve('deploy/nginx/nginx.conf'),
  'utf8',
);
const productionCompose = await readFile(
  path.resolve('docker-compose.prod.yml'),
  'utf8',
);
assert.ok(
  productionConfig.includes(
    'include /etc/nginx/conf.d/sprint8-public-seo-errors.conf;',
  ),
  'production Nginx does not include the Sprint8 adapter',
);
assert.ok(
  productionCompose.includes(
    './deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro',
  ),
  'production compose does not mount the Nginx config',
);
assert.ok(
  productionCompose.includes(
    './deploy/nginx/sprint8-public-seo-errors.conf:/etc/nginx/templates/sprint8-public-seo-errors.conf.template:ro',
  ),
  'production compose does not mount the Sprint8 adapter template',
);
assert.ok(
  productionCompose.includes(`APP_RELEASE: \${FRONTEND_VERSION:-unavailable}`),
  'production compose does not inject the release identity into Nginx',
);
assert.ok(
  productionCompose.includes(`APP_COMMIT: \${FRONTEND_COMMIT:-unavailable}`),
  'production compose does not inject the commit identity into Nginx',
);
assert.ok(
  productionCompose.includes(
    './deploy/nginx/400.txt:/etc/nginx/error-pages/400.txt:ro',
  ),
  'production compose does not mount the empty 400 response',
);
assert.ok(
  productionCompose.includes(
    './deploy/nginx/503.txt:/etc/nginx/error-pages/503.txt:ro',
  ),
  'production compose does not mount the empty 503 response',
);

const baseDockerArgs = [
  '--add-host',
  'frontend:127.0.0.1',
  '-e',
  'APP_RELEASE=v0.11.1',
  '-e',
  'APP_COMMIT=abc1234',
  '-v',
  `${wrapperPath}:/etc/nginx/nginx.conf:ro`,
  '-v',
  `${templatePath}:/etc/nginx/templates/sprint8-public-seo-errors.conf.template:ro`,
  '-v',
  `${productionEmptyErrorPath}:/etc/nginx/error-pages/400.txt:ro`,
  '-v',
  `${productionUnavailablePath}:/etc/nginx/error-pages/503.txt:ro`,
];

await writeFile(wrapperPath, productionConfig);

try {
  const syntaxContainerName = `zeroone-nginx-syntax-${process.pid}`;
  const syntax = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--name',
      syntaxContainerName,
      ...baseDockerArgs,
      'nginx:1.27-alpine',
      'nginx',
      '-t',
    ],
    { encoding: 'utf8', timeout: 120_000 },
  );
  if (syntax.status !== 0) {
    spawnSync('docker', ['rm', '-f', syntaxContainerName], {
      encoding: 'utf8',
    });
  }
  assert.equal(
    syntax.status,
    0,
    `nginx -t failed:\n${syntax.stdout}\n${syntax.stderr}`,
  );

  const upstream = createServer((request, response) => {
    const appIdentityHeaders = {
      'X-App-Commit': 'abc1234',
      'X-App-Version': 'v0.11.1',
    };
    if (request.url === '/insights/fail') {
      response.writeHead(500, {
        'Content-Type': 'text/html',
        ...appIdentityHeaders,
      });
      response.end('<html>OLD_SHELL_MUST_NOT_LEAK</html>');
      return;
    }
    if (request.url === '/private/fail') {
      response.writeHead(500, {
        'Content-Type': 'text/plain',
        ...appIdentityHeaders,
      });
      response.end('LEGACY_500_PASSTHROUGH');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/plain',
      ...appIdentityHeaders,
    });
    response.end('PUBLIC_SEO_HEALTHY');
  });
  await new Promise((resolve, reject) => {
    upstream.once('error', reject);
    upstream.listen(33390, '0.0.0.0', resolve);
  });

  const runtimeConfig = productionConfig.replace(
    'server frontend:13755;',
    'server host.docker.internal:33390;',
  );
  await writeFile(wrapperPath, runtimeConfig);
  const containerName = `zeroone-nginx-contract-${process.pid}`;
  try {
    const start = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '--detach',
        '--name',
        containerName,
        '--add-host',
        'host.docker.internal:host-gateway',
        '-p',
        '127.0.0.1:33391:13755',
        ...baseDockerArgs,
        'nginx:1.27-alpine',
      ],
      { encoding: 'utf8', timeout: 120_000 },
    );
    assert.equal(start.status, 0, `failed to start Nginx: ${start.stderr}`);

    let healthy;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        healthy = await fetch('http://127.0.0.1:33391/insights/healthy');
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(healthy?.status, 200);
    assert.equal(await healthy.text(), 'PUBLIC_SEO_HEALTHY');
    assert.equal(healthy.headers.get('x-app-version'), 'v0.11.1');
    assert.equal(healthy.headers.get('x-app-commit'), 'abc1234');

    const mapped = await fetch('http://127.0.0.1:33391/insights/fail');
    assert.equal(mapped.status, 503);
    assert.equal(mapped.headers.get('retry-after'), '60');
    assert.equal(mapped.headers.get('cache-control'), 'no-store');
    assert.equal(mapped.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(mapped.headers.get('x-app-version'), 'v0.11.1');
    assert.equal(mapped.headers.get('x-app-commit'), 'abc1234');
    assert.match(mapped.headers.get('content-type') ?? '', /^text\/html/u);
    const unavailableBody = await mapped.text();
    assert.match(unavailableBody, /글을 잠시 불러오지 못했습니다/u);
    assert.match(unavailableBody, /이 글 다시 시도/u);
    assert.match(unavailableBody, /href="\/insights"/u);
    assert.doesNotMatch(unavailableBody, /OLD_SHELL_MUST_NOT_LEAK/u);

    const legacy = await fetch('http://127.0.0.1:33391/private/fail');
    assert.equal(legacy.status, 500);
    assert.equal(await legacy.text(), 'LEGACY_500_PASSTHROUGH');

    for (const pathname of [
      '//insights/%2e%2e/admin',
      '/ins%69ghts/%2e%2e/admin',
      '/insights/../admin',
      '/insights/%2e%2e/admin',
      '/insights/.%2e/admin',
      '/insights/%2e./admin',
      '/insights%2f%2e%2e%2fadmin',
      '/insights/%252e%252e%252fadmin',
      '/insights/%25252e%25252e/admin',
      '/insights/\\admin',
      '/insights/%5cadmin',
      '/community/questions/%0d%0aLocation:%20https://evil.example',
    ]) {
      const rejected = await requestRawPath(pathname);
      assert.equal(rejected.status, 400, pathname);
      assert.equal(rejected.headers.location, undefined, pathname);
      assert.equal(rejected.headers['cache-control'], 'no-store', pathname);
      assert.equal(
        rejected.headers['x-content-type-options'],
        'nosniff',
        pathname,
      );
      assert.equal(rejected.headers['x-app-version'], 'v0.11.1', pathname);
      assert.equal(rejected.headers['x-app-commit'], 'abc1234', pathname);
      assert.equal(rejected.body, '', pathname);
      assert.equal(
        /nginx\/[\d.]+/iu.test(rejected.headers.server ?? ''),
        false,
      );
    }

    for (const pathname of [
      '/insights/node%2ejs',
      '/insights/v1...v2',
      '/insights/healthy?next=%2e%2e%2fadmin',
    ]) {
      const accepted = await requestRawPath(pathname);
      assert.equal(accepted.status, 200, pathname);
      assert.equal(accepted.headers.location, undefined, pathname);
      assert.equal(accepted.body, 'PUBLIC_SEO_HEALTHY', pathname);
    }
  } finally {
    spawnSync('docker', ['rm', '-f', containerName], { encoding: 'utf8' });
    await new Promise((resolve) => upstream.close(resolve));
  }

  await writeFile(
    wrapperPath,
    runtimeConfig.replace(
      'server host.docker.internal:33390;',
      'server host.docker.internal:3210;',
    ),
  );
  const actualContainerName = `zeroone-nginx-actual-next-${process.pid}`;
  try {
    const startActual = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '--detach',
        '--name',
        actualContainerName,
        '--add-host',
        'host.docker.internal:host-gateway',
        '-p',
        '127.0.0.1:33392:13755',
        ...baseDockerArgs,
        'nginx:1.27-alpine',
      ],
      { encoding: 'utf8', timeout: 120_000 },
    );
    assert.equal(
      startActual.status,
      0,
      `failed to start actual-Next Nginx: ${startActual.stderr}`,
    );

    let actualHealthy;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        actualHealthy = await fetch('http://127.0.0.1:33392/insights');
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(actualHealthy?.status, 200);
    assert.match(await actualHealthy.text(), /rel="canonical"[^>]*\/insights/u);

    for (const pathname of [
      '//insights/%2e%2e/admin',
      '/ins%69ghts/%2e%2e/admin',
      '/insights/.%2e/admin',
      '/insights/%252e%252e%252fadmin',
      '/community/questions/%0d%0aLocation:%20https://evil.example',
    ]) {
      const rejected = await requestRawPath(pathname, 33392);
      assert.equal(rejected.status, 400, pathname);
      assert.equal(rejected.body, '', pathname);
      assert.equal(rejected.headers.location, undefined, pathname);
      assert.equal(rejected.headers['cache-control'], 'no-store', pathname);
      assert.equal(
        rejected.headers['x-content-type-options'],
        'nosniff',
        pathname,
      );
      assert.equal(rejected.headers['x-app-version'], 'v0.11.1', pathname);
      assert.equal(rejected.headers['x-app-commit'], 'abc1234', pathname);
      assert.equal(
        /nginx\/[\d.]+/iu.test(rejected.headers.server ?? ''),
        false,
        pathname,
      );
    }

    const validEncodedDot = await requestRawPath('/insights/node%2ejs', 33392);
    assert.equal(validEncodedDot.status, 404);
    assert.equal(validEncodedDot.headers.location, undefined);
    assert.match(validEncodedDot.headers['cache-control'] ?? '', /no-store/u);

    const weekly = await requestRawPath('/insights/weekly?category=dep', 33392);
    assert.equal(weekly.status, 308);
    assert.equal(weekly.headers.location, '/insights');
  } finally {
    spawnSync('docker', ['rm', '-f', actualContainerName], {
      encoding: 'utf8',
    });
  }
  process.stdout.write('Sprint8 Nginx ingress contract: PASS\n');
  process.stdout.write(
    'Nginx production template/envsubst/conf.d syntax: PASS\n',
  );
  process.stdout.write('Nginx live 200/500-to-503/legacy passthrough: PASS\n');
  process.stdout.write('Nginx raw traversal/control rejection: PASS\n');
  process.stdout.write('Nginx actual Next S-009/weekly/canonical: PASS\n');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
