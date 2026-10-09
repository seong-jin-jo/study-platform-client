import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { resolveBuildMetadata } from './build-version-env.mjs';

const BUILD_VALUE_UNAVAILABLE = 'unavailable';

const { release, commit, buildId, builtAt, channel } = resolveBuildMetadata({
  cwd: process.cwd(),
  env: process.env,
});

const rawVersion =
  process.env.NEXT_PUBLIC_PWA_CACHE_VERSION ??
  process.env.GITHUB_SHA ??
  commit ??
  randomUUID();
const cacheVersion = rawVersion.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
const nextBin = path.join(process.cwd(), 'node_modules/next/dist/bin/next');
const buildEnvironment = {
  NEXT_PUBLIC_APP_RELEASE: release ?? BUILD_VALUE_UNAVAILABLE,
  NEXT_PUBLIC_APP_COMMIT: commit ?? BUILD_VALUE_UNAVAILABLE,
  NEXT_PUBLIC_APP_BUILD_ID: buildId ?? BUILD_VALUE_UNAVAILABLE,
  NEXT_PUBLIC_APP_BUILT_AT: builtAt ?? BUILD_VALUE_UNAVAILABLE,
  NEXT_PUBLIC_APP_CHANNEL: channel ?? BUILD_VALUE_UNAVAILABLE,
};

console.log(`PWA cache version: ${cacheVersion}`);
console.log(
  `App build: ${buildEnvironment.NEXT_PUBLIC_APP_RELEASE} (${buildEnvironment.NEXT_PUBLIC_APP_COMMIT.slice(0, 7)}) / ${buildEnvironment.NEXT_PUBLIC_APP_BUILD_ID} / ${buildEnvironment.NEXT_PUBLIC_APP_CHANNEL}`,
);

const child = spawn(process.execPath, [nextBin, 'build'], {
  env: {
    ...process.env,
    NEXT_PUBLIC_PWA_CACHE_VERSION: cacheVersion,
    ...buildEnvironment,
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`next build terminated by ${signal}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
