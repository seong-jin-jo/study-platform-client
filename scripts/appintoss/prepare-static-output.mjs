import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import ts from 'typescript';

const TEXT_ASSET_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.rsc',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
]);

const LOCAL_ASSET_URL_PATTERN =
  /(?:^|["'`(=:,\s])((?:\/(?!\/))[A-Za-z0-9@._~%+/-]+\.(?:avif|css|gif|ico|jpe?g|json|mp4|otf|png|svg|ttf|webm|webmanifest|woff2?)(?:[?#][A-Za-z0-9@._~%+&=/-]*)?)/gi;

const SOURCE_PUBLIC_ASSET_PATH_PATTERN =
  /^\/(?!\/)[A-Za-z0-9@._~%+/${}-]+\.(?:avif|gif|ico|jpe?g|mp4|otf|png|svg|ttf|webm|webp|woff2?)(?:[?#][A-Za-z0-9@._~%+&=/${}-]*)?$/i;

export const APPINTOSS_PNG_PROFILES = new Map([
  ['class/detail/benefit-3.png', { width: 192 }],
  ['class/detail/claude-pro-gift.png', { width: 192 }],
]);

async function walkFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(filePath)));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function normalizeEmbeddedText(source) {
  return source
    .replaceAll('\\/', '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\x2f/gi, '/');
}

function extractLocalAssetPaths(source) {
  const paths = new Set();
  for (const match of normalizeEmbeddedText(source).matchAll(
    LOCAL_ASSET_URL_PATTERN,
  )) {
    const pathname = match[1].split(/[?#]/, 1)[0];
    try {
      paths.add(decodeURIComponent(pathname).replace(/^\//, ''));
    } catch {
      paths.add(pathname.replace(/^\//, ''));
    }
  }
  return paths;
}

function normalizeAssetPath(pathname) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(withoutQuery).replace(/^\//, '');
  } catch {
    return withoutQuery.replace(/^\//, '');
  }
}

function escapeRegularExpression(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceTemplateToPattern(template) {
  const marker = '__APPINTOSS_SEGMENT__';
  const normalized = normalizeEmbeddedText(template).replace(
    /\$\{[^}]+\}/g,
    marker,
  );
  const pathname = normalizeAssetPath(normalized);
  const expression = escapeRegularExpression(pathname).replaceAll(
    marker,
    '[^/]+',
  );
  return { expression: new RegExp(`^${expression}$`), template };
}

function collectSourceAssetExpressions(filePath, source) {
  const scriptKind = /\.tsx$/i.test(filePath)
    ? ts.ScriptKind.TSX
    : /\.jsx$/i.test(filePath)
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKind,
  );
  const exactPaths = new Set();
  const templates = new Set();

  function visit(node) {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      SOURCE_PUBLIC_ASSET_PATH_PATTERN.test(node.text)
    ) {
      exactPaths.add(normalizeAssetPath(node.text));
    } else if (ts.isTemplateExpression(node)) {
      const template = `${node.head.text}${node.templateSpans
        .map((span) => `\${segment}${span.literal.text}`)
        .join('')}`;
      if (SOURCE_PUBLIC_ASSET_PATH_PATTERN.test(template)) {
        templates.add(template);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { exactPaths, templates };
}

export async function collectSourcePublicAssets(sourceFiles, publicRoot) {
  const absolutePublicRoot = path.resolve(publicRoot);
  const publicFiles = new Set(
    (await walkFiles(absolutePublicRoot)).map((filePath) =>
      path.relative(absolutePublicRoot, filePath),
    ),
  );
  const exactPaths = new Set();
  const templatePatterns = new Map();

  for (const filePath of sourceFiles) {
    const source = normalizeEmbeddedText(await readFile(filePath, 'utf8'));
    const expressions = collectSourceAssetExpressions(filePath, source);
    for (const relativePath of expressions.exactPaths) {
      exactPaths.add(relativePath);
    }
    for (const template of expressions.templates) {
      const pattern = sourceTemplateToPattern(template);
      templatePatterns.set(pattern.template, pattern.expression);
    }
  }

  const referenced = new Set(exactPaths);
  const unmatchedTemplates = [];
  for (const [template, pattern] of templatePatterns) {
    let matches = 0;
    for (const relativePath of publicFiles) {
      if (!pattern.test(relativePath)) continue;
      referenced.add(relativePath);
      matches += 1;
    }
    if (matches === 0) unmatchedTemplates.push(template);
  }

  return {
    exactPaths,
    publicFiles,
    referenced,
    templates: [...templatePatterns.keys()],
    unmatchedTemplates,
  };
}

async function fileSize(filePath) {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    throw error;
  }
}

export async function collectReferencedPublicAssets(
  outputRoot,
  publicRoot,
  { sourceFiles = [] } = {},
) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  const absolutePublicRoot = path.resolve(publicRoot);
  const publicFiles = new Set(
    (await walkFiles(absolutePublicRoot)).map((filePath) =>
      path.relative(absolutePublicRoot, filePath),
    ),
  );
  const outputFiles = await walkFiles(absoluteOutputRoot);
  const queue = outputFiles.filter((filePath) => {
    const relativePath = path.relative(absoluteOutputRoot, filePath);
    return (
      !publicFiles.has(relativePath) &&
      TEXT_ASSET_EXTENSIONS.has(path.extname(filePath))
    );
  });
  const scanned = new Set();
  const referenced = new Set();

  if (sourceFiles.length > 0) {
    const sourceAssets = await collectSourcePublicAssets(
      sourceFiles,
      absolutePublicRoot,
    );
    for (const relativePath of sourceAssets.referenced) {
      if (publicFiles.has(relativePath)) referenced.add(relativePath);
    }
  }

  while (queue.length > 0) {
    const filePath = queue.pop();
    if (!filePath || scanned.has(filePath)) continue;
    scanned.add(filePath);
    const source = await readFile(filePath, 'utf8');

    for (const relativePath of extractLocalAssetPaths(source)) {
      if (!publicFiles.has(relativePath)) continue;
      if (referenced.has(relativePath)) continue;
      referenced.add(relativePath);
      if (TEXT_ASSET_EXTENSIONS.has(path.extname(relativePath))) {
        queue.push(path.join(absoluteOutputRoot, relativePath));
      }
    }
  }

  return { publicFiles, referenced };
}

export async function pruneUnreferencedPublicAssets(
  outputRoot,
  publicRoot,
  options = {},
) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  const { publicFiles, referenced } = await collectReferencedPublicAssets(
    absoluteOutputRoot,
    publicRoot,
    options,
  );
  let removedBytes = 0;
  let removedFiles = 0;

  for (const relativePath of publicFiles) {
    if (referenced.has(relativePath)) continue;
    const outputPath = path.join(absoluteOutputRoot, relativePath);
    const bytes = await fileSize(outputPath);
    if (bytes === 0) continue;
    await rm(outputPath, { force: true });
    removedBytes += bytes;
    removedFiles += 1;
  }

  return {
    keptFiles: referenced.size,
    removedBytes,
    removedFiles,
  };
}

function outputAssetPath(relativePath) {
  return APPINTOSS_PNG_PROFILES.has(relativePath)
    ? relativePath.replace(/\.png$/i, '.appintoss.webp')
    : relativePath;
}

export async function assertSourcePublicAssetsExist(
  outputRoot,
  publicRoot,
  sourceFiles,
) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  const sourceAssets = await collectSourcePublicAssets(sourceFiles, publicRoot);
  const failures = [];

  for (const relativePath of sourceAssets.exactPaths) {
    if (!sourceAssets.publicFiles.has(relativePath)) {
      failures.push(`source asset is absent from public: /${relativePath}`);
    }
  }
  for (const template of sourceAssets.unmatchedTemplates) {
    failures.push(`source asset template matched no public files: ${template}`);
  }
  for (const relativePath of sourceAssets.referenced) {
    const expectedOutputPath = outputAssetPath(relativePath);
    if (
      (await fileSize(path.join(absoluteOutputRoot, expectedOutputPath))) === 0
    ) {
      failures.push(
        `source asset is absent from output: /${expectedOutputPath}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `App-in-Toss source public asset boundary failed:\n${failures.join('\n')}`,
    );
  }

  return {
    assets: sourceAssets.referenced.size,
    exact: sourceAssets.exactPaths.size,
    templates: sourceAssets.templates.length,
  };
}

async function replaceAssetReference(outputRoot, sourceUrl, destinationUrl) {
  const textFiles = (await walkFiles(outputRoot)).filter((filePath) =>
    TEXT_ASSET_EXTENSIONS.has(path.extname(filePath)),
  );
  const escapedSourceUrl = sourceUrl.replaceAll('/', '\\/');
  const escapedDestinationUrl = destinationUrl.replaceAll('/', '\\/');

  for (const filePath of textFiles) {
    const source = await readFile(filePath, 'utf8');
    const replaced = source
      .replaceAll(sourceUrl, destinationUrl)
      .replaceAll(escapedSourceUrl, escapedDestinationUrl);
    if (replaced !== source) await writeFile(filePath, replaced);
  }
}

export async function optimizeAppintossPngAssets(
  outputRoot,
  profiles = APPINTOSS_PNG_PROFILES,
) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  const optimized = [];

  for (const [relativePath, profile] of profiles) {
    const sourcePath = path.join(absoluteOutputRoot, relativePath);
    const sourceBytes = await fileSize(sourcePath);
    if (sourceBytes === 0) continue;

    const destinationRelativePath = relativePath.replace(
      /\.png$/i,
      '.appintoss.webp',
    );
    const destinationPath = path.join(
      absoluteOutputRoot,
      destinationRelativePath,
    );
    await sharp(sourcePath)
      .resize({
        width: profile.width,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(destinationPath);
    await replaceAssetReference(
      absoluteOutputRoot,
      `/${relativePath}`,
      `/${destinationRelativePath}`,
    );
    await rm(sourcePath, { force: true });

    optimized.push({
      destinationRelativePath,
      destinationBytes: await fileSize(destinationPath),
      sourceBytes,
      sourceRelativePath: relativePath,
      width: profile.width,
    });
  }

  return optimized;
}

export async function removeStaticSourceMaps(outputRoot) {
  const absoluteOutputRoot = path.resolve(outputRoot);
  const files = await walkFiles(absoluteOutputRoot);
  const sourceMaps = files.filter((filePath) => filePath.endsWith('.map'));
  let removedBytes = 0;

  for (const filePath of sourceMaps) {
    removedBytes += await fileSize(filePath);
    await rm(filePath, { force: true });
  }

  let strippedReferences = 0;
  for (const filePath of files.filter((candidate) =>
    /\.(?:css|js|mjs)$/.test(candidate),
  )) {
    const source = await readFile(filePath, 'utf8');
    const replaced = source
      .replace(/^\/\/[#@]\s*sourceMappingURL=.*$/gm, () => {
        strippedReferences += 1;
        return '';
      })
      .replace(/\/\*[#@]\s*sourceMappingURL=.*?\*\//gs, () => {
        strippedReferences += 1;
        return '';
      });
    if (replaced !== source) await writeFile(filePath, replaced);
  }

  return {
    removedBytes,
    removedFiles: sourceMaps.length,
    strippedReferences,
  };
}
