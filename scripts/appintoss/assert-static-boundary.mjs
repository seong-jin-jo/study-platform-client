import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_ROUTES = [
  'page.tsx',
  'insights/page.tsx',
  'insights/read/page.tsx',
  'community/page.tsx',
  'community/read/page.tsx',
  'class/page.tsx',
  'class/detail/page.tsx',
];

const FORBIDDEN_SOURCE_PATTERNS = [
  { label: 'next/headers', pattern: /from\s+['"]next\/headers['"]/ },
  { label: 'server-only', pattern: /(?:from\s+|import\s*)['"]server-only['"]/ },
  { label: 'force-dynamic', pattern: /force-dynamic/ },
  { label: 'cookies()', pattern: /\bcookies\s*\(/ },
  { label: 'headers()', pattern: /\bheaders\s*\(/ },
  {
    label: 'LoginModal static import',
    pattern: /from\s+['"][^'"]*login-modal['"]/,
  },
  {
    label: 'location assignment',
    pattern:
      /(?:window\.)?location(?:\.href)?\s*=|(?:window\.)?location\.(?:assign|replace)\s*\(/,
  },
  { label: 'window.open()', pattern: /\bwindow\.open\s*\(/ },
  { label: 'eval()', pattern: /\beval\s*\(/ },
  {
    label: 'Next image optimizer URL',
    pattern: /\/_next\/image\?url=/i,
  },
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  {
    label: 'Google OAuth',
    pattern: /accounts\.google\.com|oauth2\/authorization\/google/i,
  },
  {
    label: 'Kakao OAuth',
    pattern: /kauth\.kakao\.com|oauth2\/authorization\/kakao/i,
  },
  {
    label: 'Toss Payments',
    pattern: /js\.tosspayments\.com|api\.tosspayments\.com/i,
  },
  {
    label: 'Google Sheets server endpoint',
    pattern: /notify-user-by-email|study-ready-form/i,
  },
];

const STATIC_ROUTE_PAYLOAD_EXTENSIONS = new Set([
  '.html',
  '.json',
  '.rsc',
  '.txt',
]);

const NEXT_IMAGE_OPTIMIZER_REQUEST = /\/_next\/image\?url=/i;
export const APPINTOSS_MAX_UNCOMPRESSED_BYTES = 30 * 1024 * 1024;

async function walkFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function resolveSourceModule(specifier, importer, sourceRoot) {
  let unresolvedPath;
  const appintossAliases = new Map([
    ['next/link', 'components/appintoss/appintoss-link'],
    ['@/features/auth/model/use-auth', 'components/appintoss/appintoss-auth'],
    [
      '@/components/saved-resource/save-resource-button',
      'components/appintoss/appintoss-save-resource-button',
    ],
    [
      '@/api/client/auth-response-interceptor',
      'components/appintoss/appintoss-auth-response-interceptor',
    ],
  ]);
  const appintossAlias = appintossAliases.get(specifier);
  if (appintossAlias) {
    const projectedModule = path.join(sourceRoot, appintossAlias);
    try {
      const hasProjectedModule = await Promise.any(
        ['.ts', '.tsx'].map(async (extension) =>
          (await stat(`${projectedModule}${extension}`)).isFile(),
        ),
      );
      if (hasProjectedModule) {
        unresolvedPath = projectedModule;
      }
    } catch {
      // Non-projected test fixtures use the normal alias resolver below.
    }
  }
  if (!unresolvedPath && specifier.startsWith('@/')) {
    unresolvedPath = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    unresolvedPath = path.resolve(path.dirname(importer), specifier);
  } else {
    return undefined;
  }

  const candidates = [
    unresolvedPath,
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs'].map(
      (extension) => `${unresolvedPath}${extension}`,
    ),
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs'].map((extension) =>
      path.join(unresolvedPath, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Keep resolving the remaining supported source extensions.
    }
  }
  return undefined;
}

function findSourceImports(source) {
  const specifiers = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return specifiers;
}

async function collectReachableSourceModules(entryFiles, sourceRoot) {
  const queue = [...entryFiles];
  const visited = new Set();
  while (queue.length > 0) {
    const filePath = queue.pop();
    if (!filePath || visited.has(filePath)) continue;
    visited.add(filePath);
    const source = await readFile(filePath, 'utf8');
    for (const specifier of findSourceImports(source)) {
      const dependency = await resolveSourceModule(
        specifier,
        filePath,
        sourceRoot,
      );
      if (dependency && !visited.has(dependency)) queue.push(dependency);
    }
  }
  return visited;
}

export async function collectStaticSourceFiles(appRoot) {
  const absoluteRoot = path.resolve(appRoot);
  const sourceRoot = path.dirname(absoluteRoot);
  const appFiles = (await walkFiles(absoluteRoot)).filter((filePath) =>
    /\.(?:js|jsx|mjs|ts|tsx)$/.test(filePath),
  );
  return collectReachableSourceModules(appFiles, sourceRoot);
}

async function assertFileExists(filePath, label) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('not a file');
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

export async function assertStaticSourceBoundary(appRoot) {
  const absoluteRoot = path.resolve(appRoot);
  const sourceRoot = path.dirname(absoluteRoot);
  const files = await collectStaticSourceFiles(absoluteRoot);
  const failures = [];

  for (const route of EXPECTED_ROUTES) {
    await assertFileExists(
      path.join(absoluteRoot, route),
      `Allowed route ${route}`,
    );
  }

  for (const filePath of files) {
    const relativePath = path.relative(sourceRoot, filePath);
    if (/^route\.(?:js|jsx|ts|tsx)$/.test(path.basename(filePath))) {
      failures.push(`${relativePath}: Route Handler is forbidden`);
      continue;
    }
    if (/^middleware\.(?:js|jsx|ts|tsx)$/.test(path.basename(filePath))) {
      failures.push(`${relativePath}: middleware is forbidden`);
      continue;
    }
    const source = await readFile(filePath, 'utf8');
    for (const { label, pattern } of FORBIDDEN_SOURCE_PATTERNS) {
      if (pattern.test(source)) failures.push(`${relativePath}: ${label}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `App-in-Toss static source boundary failed:\n${failures.join('\n')}`,
    );
  }

  return { files: files.size, routes: EXPECTED_ROUTES.length };
}

function outputRouteCandidates(outputRoot, route) {
  if (route === '/') return [path.join(outputRoot, 'index.html')];
  const relative = route.replace(/^\//, '');
  return [
    path.join(outputRoot, relative, 'index.html'),
    path.join(outputRoot, `${relative}.html`),
  ];
}

export async function assertStaticPackageSize(
  outputRoot,
  { logger = console.log, maxBytes = APPINTOSS_MAX_UNCOMPRESSED_BYTES } = {},
) {
  const absoluteRoot = path.resolve(outputRoot);
  const files = await walkFiles(absoluteRoot);
  const entries = await Promise.all(
    files.map(async (filePath) => ({
      bytes: (await stat(filePath)).size,
      path: path.relative(absoluteRoot, filePath),
    })),
  );
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const topFiles = entries
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 10);

  logger(
    `APPINTOSS_PACKAGE_SIZE bytes=${totalBytes} limit=${maxBytes} files=${entries.length}`,
  );
  topFiles.forEach((entry, index) => {
    logger(
      `APPINTOSS_PACKAGE_TOP rank=${index + 1} bytes=${entry.bytes} path=${entry.path}`,
    );
  });

  if (totalBytes > maxBytes) {
    throw new Error(
      `App-in-Toss static output exceeds ${maxBytes} bytes: ${totalBytes}`,
    );
  }

  return { files: entries.length, maxBytes, topFiles, totalBytes };
}

export async function assertStaticOutput(outputRoot) {
  const absoluteRoot = path.resolve(outputRoot);
  const routePaths = [
    '/',
    '/insights',
    '/insights/read',
    '/community',
    '/community/read',
    '/class',
    '/class/detail',
  ];

  for (const route of routePaths) {
    const candidates = outputRouteCandidates(absoluteRoot, route);
    const existence = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          return (await stat(candidate)).isFile();
        } catch {
          return false;
        }
      }),
    );
    if (!existence.some(Boolean)) {
      throw new Error(`Static route output is missing for ${route}`);
    }
  }

  const packageSize = await assertStaticPackageSize(absoluteRoot);
  const files = (await walkFiles(absoluteRoot)).filter((filePath) =>
    /\.(?:html|js|json|mjs|rsc|txt)$/.test(filePath),
  );
  const failures = [];
  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    // Next bundles its default image loader, including `/_next/image`, even
    // when `images.unoptimized` makes get-img-props return the original src
    // before that loader can run. Validate serialized route payloads where a
    // browser-visible optimizer request is actually emitted, while the source
    // boundary above rejects directly authored optimizer URLs.
    if (
      STATIC_ROUTE_PAYLOAD_EXTENSIONS.has(path.extname(filePath)) &&
      NEXT_IMAGE_OPTIMIZER_REQUEST.test(source)
    ) {
      failures.push(
        `${path.relative(absoluteRoot, filePath)}: Next image optimizer URL`,
      );
    }
    for (const { label, pattern } of FORBIDDEN_OUTPUT_PATTERNS) {
      if (pattern.test(source)) {
        failures.push(`${path.relative(absoluteRoot, filePath)}: ${label}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `App-in-Toss static output boundary failed:\n${failures.join('\n')}`,
    );
  }

  return {
    bytes: packageSize.totalBytes,
    files: files.length,
    routes: routePaths.length,
  };
}

async function main() {
  const [mode, targetPath] = process.argv.slice(2);
  if (!targetPath || !['source', 'output'].includes(mode)) {
    throw new Error(
      'Usage: node assert-static-boundary.mjs <source|output> <path>',
    );
  }

  const result =
    mode === 'source'
      ? await assertStaticSourceBoundary(targetPath)
      : await assertStaticOutput(targetPath);
  console.log(
    `APPINTOSS_BOUNDARY_OK mode=${mode} routes=${result.routes} files=${result.files}${result.bytes === undefined ? '' : ` bytes=${result.bytes}`}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
