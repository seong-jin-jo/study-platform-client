import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_BUILD_METADATA } from '@/lib/app-build-metadata';
import { nextConfig } from '../../next.config';
import { GET as getApiVersion } from './api/version/route';
import { GET as getVersionJson } from './version.json/route';

describe('WEB-VERSION-004 버전 JSON 엔드포인트', () => {
  it.each([
    ['/api/version', getApiVersion],
    ['/version.json', getVersionJson],
  ])('%s가 홈 HTML 대신 동일한 JSON 신원을 반환한다', async (_path, get) => {
    const response = get();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-app-version')).toBe(
      APP_BUILD_METADATA.release,
    );
    expect(response.headers.get('x-app-commit')).toBe(
      APP_BUILD_METADATA.commit,
    );
    await expect(response.json()).resolves.toEqual(APP_BUILD_METADATA);
  });

  it('일반 Next 응답에도 동일한 버전 헤더 규칙을 적용한다', async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === '/(.*)');

    expect(globalRule?.headers).toEqual(
      expect.arrayContaining([
        { key: 'X-App-Version', value: APP_BUILD_METADATA.release },
        { key: 'X-App-Commit', value: APP_BUILD_METADATA.commit },
      ]),
    );
  });

  it('Next 헤더는 통과시키고 Nginx 직접 응답에만 배포 신원을 주입한다', () => {
    const projectRoot = process.cwd();
    const ingress = readFileSync(
      `${projectRoot}/deploy/nginx/sprint8-public-seo-errors.conf`,
      'utf8',
    );
    const compose = readFileSync(
      `${projectRoot}/docker-compose.prod.yml`,
      'utf8',
    );
    const workflow = readFileSync(
      `${projectRoot}/../.github/workflows/client-deploy-prod.yml`,
      'utf8',
    );
    const devWorkflow = readFileSync(
      `${projectRoot}/../.github/workflows/client-deploy-dev.yml`,
      'utf8',
    );
    const dockerfile = readFileSync(`${projectRoot}/Dockerfile.prod`, 'utf8');
    const builderStage = dockerfile.slice(
      dockerfile.indexOf('FROM node:20-alpine AS builder'),
      dockerfile.indexOf('FROM node:20-alpine AS runner'),
    );

    expect(ingress).not.toContain('proxy_hide_header X-App-Version');
    expect(ingress).not.toContain('proxy_hide_header X-App-Commit');
    expect(ingress.match(/add_header X-App-Version/g)).toHaveLength(2);
    expect(ingress.match(/add_header X-App-Commit/g)).toHaveLength(2);
    expect(compose).toContain(`APP_RELEASE: \${FRONTEND_VERSION:-unavailable}`);
    expect(compose).toContain(`APP_COMMIT: \${FRONTEND_COMMIT:-unavailable}`);
    expect(compose).toContain(
      '/etc/nginx/templates/sprint8-public-seo-errors.conf.template:ro',
    );
    expect(workflow).toContain('echo "FRONTEND_VERSION=$FRONTEND_VERSION"');
    expect(workflow).toContain('echo "FRONTEND_COMMIT=$FRONTEND_COMMIT"');
    expect(workflow).toContain('2??:2??|2??:3??|3??:2??|3??:3??');
    expect(workflow).toContain(
      'curl -fsSI --max-time 5 http://127.0.0.1:13755/version.json',
    );
    expect(workflow).toContain(
      'payload.release !== process.env.FRONTEND_VERSION',
    );
    expect(devWorkflow).toContain(
      `echo "FRONTEND_VERSION=dev-\${GITHUB_SHA::7}"`,
    );
    expect(devWorkflow).toContain('echo "FRONTEND_COMMIT=$GITHUB_SHA"');
    expect(builderStage.indexOf('yarn install --frozen-lockfile')).toBeLessThan(
      builderStage.indexOf('ARG APP_RELEASE'),
    );
    expect(builderStage.indexOf('ARG APP_RELEASE')).toBeLessThan(
      builderStage.indexOf('COPY . .'),
    );
  });
});
