import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const normalizeValue = (value) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const readDotEnvValue = (cwd, key) => {
  const envPath = path.join(cwd, '.env');
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((candidate) =>
      new RegExp(`^(?:export\\s+)?${key}\\s*=`).test(candidate.trim()),
    );
  if (!line) return undefined;

  const separator = line.indexOf('=');
  const value = normalizeValue(line.slice(separator + 1));
  return value || undefined;
};

const resolveGitSha = (cwd) => {
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

export const resolveBuildMetadata = ({
  cwd,
  env,
  gitShaResolver = resolveGitSha,
}) => {
  const fromEnvOrDotEnv = (...keys) => {
    for (const key of keys) {
      const value = env[key]?.trim() || readDotEnvValue(cwd, key);
      if (value) return value;
    }
    return undefined;
  };

  return {
    release: fromEnvOrDotEnv(
      'NEXT_PUBLIC_APP_RELEASE',
      'APP_RELEASE',
      'FRONTEND_VERSION',
    ),
    commit:
      fromEnvOrDotEnv(
        'NEXT_PUBLIC_APP_COMMIT',
        'APP_COMMIT',
        'FRONTEND_COMMIT',
        'NEXT_PUBLIC_COMMIT_SHA',
        'GITHUB_SHA',
      ) || gitShaResolver(cwd),
    buildId: fromEnvOrDotEnv(
      'NEXT_PUBLIC_APP_BUILD_ID',
      'APP_BUILD_ID',
      'FRONTEND_DEPLOY_ID',
      'GITHUB_RUN_ID',
    ),
    builtAt: fromEnvOrDotEnv(
      'NEXT_PUBLIC_APP_BUILT_AT',
      'APP_BUILT_AT',
      'DEPLOYED_AT',
    ),
    channel: fromEnvOrDotEnv(
      'NEXT_PUBLIC_APP_CHANNEL',
      'APP_CHANNEL',
      'ZEROONE_DEPLOY_TARGET',
    ),
  };
};
