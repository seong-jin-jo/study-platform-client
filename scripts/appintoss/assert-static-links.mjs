import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveAppintossHref } from '../../src/components/appintoss/resolve-appintoss-href.mjs';

async function walkHtmlFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtmlFiles(filePath)));
    else if (entry.isFile() && entry.name.endsWith('.html'))
      files.push(filePath);
  }
  return files;
}

const isInternalHref = (href) => href.startsWith('/') && !href.startsWith('//');

export async function assertAppintossStaticLinks(outputRoot) {
  const { JSDOM } = await import('jsdom');
  const absoluteRoot = path.resolve(outputRoot);
  const htmlFiles = await walkHtmlFiles(absoluteRoot);
  const failures = [];
  let internalLinks = 0;

  for (const filePath of htmlFiles) {
    const dom = new JSDOM(await readFile(filePath, 'utf8'));
    try {
      for (const anchor of dom.window.document.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href') ?? '';
        if (!isInternalHref(href)) continue;
        internalLinks += 1;
        if (!resolveAppintossHref(href)) {
          failures.push(`${path.relative(absoluteRoot, filePath)}: ${href}`);
        }
      }
    } finally {
      dom.window.close();
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `App-in-Toss static internal links failed:\n${failures.join('\n')}`,
    );
  }

  return { htmlFiles: htmlFiles.length, internalLinks };
}

async function main() {
  const outputRoot = process.argv[2];
  if (!outputRoot) {
    throw new Error('Usage: node assert-static-links.mjs <output-root>');
  }
  const result = await assertAppintossStaticLinks(outputRoot);
  console.log(
    `APPINTOSS_LINKS_OK html=${result.htmlFiles} internal=${result.internalLinks}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
