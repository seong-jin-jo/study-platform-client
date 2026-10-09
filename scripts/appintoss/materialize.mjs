import { spawn } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  stat,
  symlink,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertStaticOutput,
  assertStaticSourceBoundary,
  collectStaticSourceFiles,
} from './assert-static-boundary.mjs';
import {
  assertSourcePublicAssetsExist,
  optimizeAppintossPngAssets,
  pruneUnreferencedPublicAssets,
  removeStaticSourceMaps,
} from './prepare-static-output.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');
const SOURCE_ROOT = path.join(PROJECT_ROOT, 'src');
const APP_SOURCE_ROOT = path.join(SOURCE_ROOT, 'app-intoss');
const TEMP_PARENT = path.join(PROJECT_ROOT, '.appintoss-work');
const TEMP_PREFIX = 'projection-';
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'out-appintoss');
const REQUEST_INTERCEPTOR_PATTERN = /^(middleware|proxy)\.(c|m)?(j|t)sx?$/;

const ROOT_LINKS = [
  'next-env.d.ts',
  'package.json',
  'postcss.config.mjs',
  'public',
  'svgr.d.ts',
];

async function link(source, destination) {
  const sourceStat = await stat(source);
  await symlink(source, destination, sourceStat.isDirectory() ? 'dir' : 'file');
}

async function linkIfPresent(source, destination) {
  try {
    await link(source, destination);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export async function createProjection() {
  // A previous runner interruption may leave a projection behind. The job is
  // serialized per ref, so clearing this ignored workspace is safe and keeps
  // Turbopack's symlink targets inside the repository filesystem root.
  await rm(TEMP_PARENT, { recursive: true, force: true });
  await mkdir(TEMP_PARENT, { recursive: true });
  const workspace = await mkdtemp(path.join(TEMP_PARENT, TEMP_PREFIX));

  for (const relativePath of ROOT_LINKS) {
    await linkIfPresent(
      path.join(PROJECT_ROOT, relativePath),
      path.join(workspace, relativePath),
    );
  }
  await linkIfPresent(
    path.join(PROJECT_ROOT, 'node_modules'),
    path.join(workspace, 'node_modules'),
  );
  // TypeScript resolves `extends` from the symlink target's real path. Copy
  // both configs into the projection so `./tsconfig.base.json` is resolved
  // inside the projected project root, exactly as Next will see it.
  await cp(
    path.join(PROJECT_ROOT, 'tsconfig.json'),
    path.join(workspace, 'tsconfig.base.json'),
  );
  await cp(
    path.join(PROJECT_ROOT, 'tsconfig.appintoss.json'),
    path.join(workspace, 'tsconfig.json'),
  );
  await cp(
    path.join(PROJECT_ROOT, 'tsconfig.appintoss.json'),
    path.join(workspace, 'tsconfig.appintoss.json'),
  );
  await link(
    path.join(PROJECT_ROOT, 'next.config.ts'),
    path.join(workspace, 'next.config.ts'),
  );

  const projectedSrc = path.join(workspace, 'src');
  await mkdir(projectedSrc, { recursive: true });
  for (const entry of await readdir(SOURCE_ROOT, { withFileTypes: true })) {
    if (
      entry.name === 'app' ||
      entry.name === 'app-intoss' ||
      REQUEST_INTERCEPTOR_PATTERN.test(entry.name)
    ) {
      continue;
    }
    await link(
      path.join(SOURCE_ROOT, entry.name),
      path.join(projectedSrc, entry.name),
    );
  }

  const projectedApp = path.join(projectedSrc, 'app');
  await cp(APP_SOURCE_ROOT, projectedApp, { recursive: true });
  for (const entry of await readdir(path.join(SOURCE_ROOT, 'app'), {
    withFileTypes: true,
  })) {
    if (entry.isFile() && entry.name.endsWith('.css')) {
      await cp(
        path.join(SOURCE_ROOT, 'app', entry.name),
        path.join(projectedApp, entry.name),
      );
    }
  }

  const insightsUiDestination = path.join(
    projectedApp,
    '(service)',
    'insights',
    'ui',
  );
  await mkdir(path.dirname(insightsUiDestination), { recursive: true });
  await link(
    path.join(SOURCE_ROOT, 'app', '(service)', 'insights', 'ui'),
    insightsUiDestination,
  );

  const classClientDestination = path.join(
    projectedApp,
    '(landing)',
    'class',
    'page-client.tsx',
  );
  await mkdir(path.dirname(classClientDestination), { recursive: true });
  await link(
    path.join(SOURCE_ROOT, 'app', '(landing)', 'class', 'page-client.tsx'),
    classClientDestination,
  );

  return workspace;
}

export async function assertProjectionHasNoRequestInterceptors(workspace) {
  const projectedSrc = path.join(workspace, 'src');
  const requestInterceptors = (await readdir(projectedSrc))
    .filter((entry) => REQUEST_INTERCEPTOR_PATTERN.test(entry))
    .sort();

  if (requestInterceptors.length > 0) {
    throw new Error(
      `App-in-Toss projection includes request interceptors: ${requestInterceptors.join(', ')}`,
    );
  }
}

export async function removeProjection(workspace) {
  const resolvedWorkspace = path.resolve(workspace);
  const resolvedParent = path.resolve(TEMP_PARENT);
  if (
    path.dirname(resolvedWorkspace) !== resolvedParent ||
    !path.basename(resolvedWorkspace).startsWith(TEMP_PREFIX)
  ) {
    throw new Error(`Refusing to remove projection outside ${resolvedParent}`);
  }
  await rm(resolvedWorkspace, { recursive: true, force: true });
  await rm(resolvedParent, { recursive: true, force: true });
}

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} exited with code ${code} signal ${signal ?? 'none'}`,
          ),
        );
    });
  });
}

async function verifyProjection() {
  const workspace = await createProjection();
  try {
    await assertProjectionHasNoRequestInterceptors(workspace);
    const result = await assertStaticSourceBoundary(
      path.join(workspace, 'src', 'app'),
    );
    await run('yarn', ['tsc', '--noEmit', '-p', 'tsconfig.appintoss.json'], {
      cwd: workspace,
    });
    console.log(
      `APPINTOSS_PROJECTION_OK routes=${result.routes} files=${result.files} interceptors=0 workspace=${workspace}`,
    );
  } finally {
    await removeProjection(workspace);
    console.log(`APPINTOSS_PROJECTION_CLEANED workspace=${workspace}`);
  }
}

async function buildProjection() {
  const workspace = await createProjection();
  try {
    await assertProjectionHasNoRequestInterceptors(workspace);
    await assertStaticSourceBoundary(path.join(workspace, 'src', 'app'));
    await run('yarn', ['next', 'build', workspace], {
      env: {
        ...process.env,
        ZEROONE_BUILD_TARGET: 'appintoss',
        NEXT_PUBLIC_RUNTIME_TARGET: 'appintoss',
      },
    });
    const generatedOutput = path.join(workspace, 'out');
    const sourceFiles = await collectStaticSourceFiles(
      path.join(workspace, 'src', 'app'),
    );
    const assetResult = await pruneUnreferencedPublicAssets(
      generatedOutput,
      path.join(PROJECT_ROOT, 'public'),
      { sourceFiles: [...sourceFiles] },
    );
    console.log(
      `APPINTOSS_ASSETS_PRUNED kept=${assetResult.keptFiles} removed=${assetResult.removedFiles} removedBytes=${assetResult.removedBytes}`,
    );
    const optimizedImages = await optimizeAppintossPngAssets(generatedOutput);
    for (const image of optimizedImages) {
      console.log(
        `APPINTOSS_IMAGE_OPTIMIZED source=${image.sourceRelativePath} sourceBytes=${image.sourceBytes} output=${image.destinationRelativePath} outputBytes=${image.destinationBytes} width=${image.width}`,
      );
    }
    const sourceAssetResult = await assertSourcePublicAssetsExist(
      generatedOutput,
      path.join(PROJECT_ROOT, 'public'),
      [...sourceFiles],
    );
    console.log(
      `APPINTOSS_SOURCE_ASSETS_OK assets=${sourceAssetResult.assets} exact=${sourceAssetResult.exact} templates=${sourceAssetResult.templates}`,
    );
    const sourceMapResult = await removeStaticSourceMaps(generatedOutput);
    console.log(
      `APPINTOSS_SOURCEMAPS_REMOVED files=${sourceMapResult.removedFiles} bytes=${sourceMapResult.removedBytes} references=${sourceMapResult.strippedReferences}`,
    );
    await assertStaticOutput(generatedOutput);
    await rm(OUTPUT_ROOT, { recursive: true, force: true });
    await rename(generatedOutput, OUTPUT_ROOT);
    console.log(`APPINTOSS_BUILD_OK output=${OUTPUT_ROOT}`);
  } finally {
    await removeProjection(workspace);
    console.log(`APPINTOSS_PROJECTION_CLEANED workspace=${workspace}`);
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'verify') {
    await verifyProjection();
    return;
  }
  if (mode === 'build') {
    await buildProjection();
    return;
  }
  throw new Error(
    'Usage: node scripts/appintoss/materialize.mjs <verify|build>',
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
