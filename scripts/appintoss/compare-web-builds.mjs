// biome-ignore assist/source/organizeImports: ESLint requires external imports before Node built-ins.
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// CI intentionally does not seed production content. Compare data-independent
// public shells here; the build manifests below still compare the complete
// static and dynamic route inventory between baseline and candidate.
export const WEB_SMOKE_ROUTES = ['/', '/insights', '/community', '/class'];

/**
 * @typedef {object} FingerprintOptions
 * @property {string} [baseUrl]
 * @property {string[]} [routes]
 * @property {(input: URL | RequestInfo, init?: RequestInit) => Promise<Response>} [fetchImpl]
 */

/**
 * @typedef {object} CompareOptions
 * @property {string} [baselineUrl]
 * @property {string} [candidateUrl]
 * @property {string[]} [routes]
 * @property {(input: URL | RequestInfo, init?: RequestInit) => Promise<Response>} [fetchImpl]
 */

const normalizeGeneratedValue = (value) =>
  value
    .replace(/\/_next\/static\/[^/]+\//g, '/_next/static/<build-id>/')
    .replace(/([/.-])[a-f0-9]{8,64}(?=\.|$)/gi, '$1<content-hash>');

async function readRouteInventory(buildRoot) {
  const routesManifest = JSON.parse(
    await readFile(path.join(buildRoot, 'routes-manifest.json'), 'utf8'),
  );
  const appPathsManifest = JSON.parse(
    await readFile(
      path.join(buildRoot, 'server', 'app-paths-manifest.json'),
      'utf8',
    ),
  );

  const routes = ['staticRoutes', 'dynamicRoutes', 'dataRoutes'].flatMap(
    (group) =>
      (routesManifest[group] ?? []).map(({ page, regex }) => ({
        group,
        page,
        regex: normalizeGeneratedValue(regex ?? ''),
      })),
  );

  return {
    appPaths: Object.keys(appPathsManifest).sort(),
    routes: routes.sort((left, right) =>
      `${left.group}:${left.page}:${left.regex}`.localeCompare(
        `${right.group}:${right.page}:${right.regex}`,
      ),
    ),
  };
}

export function normalizeRenderedHtml(html) {
  const document = new JSDOM(html).window.document;
  document
    .querySelectorAll(
      'script, style, link[rel="preload"], link[rel="stylesheet"]',
    )
    .forEach((element) => {
      element.remove();
    });

  document.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (
        attribute.name === 'nonce' ||
        attribute.name.startsWith('data-nextjs') ||
        attribute.name === 'data-next-hide-fouc'
      ) {
        element.removeAttribute(attribute.name);
        continue;
      }
      const normalized = normalizeGeneratedValue(attribute.value);
      if (normalized !== attribute.value) {
        element.setAttribute(attribute.name, normalized);
      }
    }
  });

  return document.body.innerHTML.replace(/>\s+</g, '><').trim();
}

async function fetchRenderedRoute(baseUrl, route, fetchImpl) {
  const url = new URL(route, baseUrl);
  let lastError;

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetchImpl(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return {
        route,
        status: response.status,
        html: normalizeRenderedHtml(await response.text()),
      };
    } catch (error) {
      lastError = error;
      if (attempt < 60) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error(`Failed to render ${url}: ${String(lastError)}`);
}

async function readRenderedRoutes(baseUrl, routes, fetchImpl) {
  return Promise.all(
    routes.map((route) => fetchRenderedRoute(baseUrl, route, fetchImpl)),
  );
}

/**
 * @param {string} buildRoot
 * @param {FingerprintOptions} [options]
 */
export async function createWebBuildFingerprint(
  buildRoot,
  { baseUrl, routes = WEB_SMOKE_ROUTES, fetchImpl = fetch } = {},
) {
  return {
    routeInventory: await readRouteInventory(buildRoot),
    renderedRoutes: baseUrl
      ? await readRenderedRoutes(baseUrl, routes, fetchImpl)
      : [],
  };
}

/**
 * @param {string} baselineRoot
 * @param {string} candidateRoot
 * @param {CompareOptions} [options]
 */
export async function compareWebBuilds(
  baselineRoot,
  candidateRoot,
  {
    baselineUrl,
    candidateUrl,
    routes = WEB_SMOKE_ROUTES,
    fetchImpl = fetch,
  } = {},
) {
  const [baseline, candidate] = await Promise.all([
    createWebBuildFingerprint(baselineRoot, {
      baseUrl: baselineUrl,
      routes,
      fetchImpl,
    }),
    createWebBuildFingerprint(candidateRoot, {
      baseUrl: candidateUrl,
      routes,
      fetchImpl,
    }),
  ]);

  return {
    baseline,
    candidate,
    equal: JSON.stringify(baseline) === JSON.stringify(candidate),
  };
}

async function main() {
  const [baselineRoot, candidateRoot, baselineUrl, candidateUrl] =
    process.argv.slice(2);
  if (!baselineRoot || !candidateRoot || !baselineUrl || !candidateUrl) {
    throw new Error(
      'Usage: node scripts/appintoss/compare-web-builds.mjs <baseline-.next> <candidate-.next> <baseline-url> <candidate-url>',
    );
  }

  const result = await compareWebBuilds(
    path.resolve(baselineRoot),
    path.resolve(candidateRoot),
    { baselineUrl, candidateUrl },
  );
  if (!result.equal) {
    console.error('WEB_UNCHANGED_MISMATCH');
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    `WEB_UNCHANGED_OK routes=${result.candidate.routeInventory.appPaths.length} rendered=${result.candidate.renderedRoutes.length}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
