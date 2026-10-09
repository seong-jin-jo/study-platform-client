#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

const projectRoot = resolve(process.cwd());
const publicRoot = join(projectRoot, 'src/app/(public-seo)');
const configFile = ts.readConfigFile(
  join(projectRoot, 'tsconfig.json'),
  ts.sys.readFile,
);
const config = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot,
);
const host = ts.createCompilerHost(config.options, true);

const sourceExtensions = /\.(?:ts|tsx|mts|cts)$/;
const excluded = /\.(?:test|spec)\.[^.]+$/;
const roots = [];
const collect = (path) => {
  for (const name of readdirSync(path)) {
    const item = join(path, name);
    if (statSync(item).isDirectory()) collect(item);
    else if (sourceExtensions.test(item) && !excluded.test(item))
      roots.push(item);
  }
};
collect(publicRoot);

const visited = new Set();
const violations = [];
const bannedPath =
  /(?:features\/auth\/server|api\/endpoints\/(?:profile|onboarding)|read-server-auth-session)/;
const bannedCalls = new Set(['headers', 'cookies', 'readServerAuthSession']);

const visit = (file) => {
  const normalized = resolve(file);
  if (
    visited.has(normalized) ||
    !normalized.startsWith(join(projectRoot, 'src'))
  )
    return;
  visited.add(normalized);
  const text = readFileSync(normalized, 'utf8');
  if (bannedPath.test(normalized))
    violations.push(`banned module reached: ${normalized}`);

  const source = ts.createSourceFile(
    normalized,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const inspect = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      bannedCalls.has(node.expression.text)
    ) {
      const location = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      violations.push(
        `banned call ${node.expression.text}(): ${normalized}:${location.line + 1}`,
      );
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);

  const imports = ts.preProcessFile(text, true, true).importedFiles;
  for (const imported of imports) {
    const specifier = imported.fileName;
    if (bannedPath.test(specifier))
      violations.push(`banned import ${specifier}: ${normalized}`);
    const resolution = ts.resolveModuleName(
      specifier,
      normalized,
      config.options,
      host,
    ).resolvedModule;
    if (resolution?.resolvedFileName) visit(resolution.resolvedFileName);
  }
};

for (const root of roots) visit(root);

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} public import graph violations`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `PASS: ${roots.length} public entries, ${visited.size} transitive src modules, banned auth/profile/onboarding imports and dynamic API calls 0`,
  );
}
