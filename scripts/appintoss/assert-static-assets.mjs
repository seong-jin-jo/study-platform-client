import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectStaticSourceFiles } from './assert-static-boundary.mjs';
import { assertSourcePublicAssetsExist } from './prepare-static-output.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');

export async function assertStaticAssets(
  outputRoot,
  appRoot = path.join(PROJECT_ROOT, 'src', 'app-intoss'),
  publicRoot = path.join(PROJECT_ROOT, 'public'),
) {
  const sourceFiles = await collectStaticSourceFiles(appRoot);
  return assertSourcePublicAssetsExist(outputRoot, publicRoot, [
    ...sourceFiles,
  ]);
}

async function main() {
  const outputRoot = path.resolve(
    process.argv[2] ?? path.join(PROJECT_ROOT, 'out-appintoss'),
  );
  const result = await assertStaticAssets(outputRoot);
  console.log(
    `APPINTOSS_SOURCE_ASSETS_OK assets=${result.assets} exact=${result.exact} templates=${result.templates}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
