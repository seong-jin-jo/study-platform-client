import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectViolations,
  compareWithBaseline,
  summarizeViolations,
} from '../design-lint.mjs';

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(TEST_DIRECTORY, '../design-lint.mjs');
const temporaryDirectories = [];

function createFixture(source) {
  const projectRoot = fs.mkdtempSync(
    path.join('/tmp', 'zero-one-design-lint-'),
  );
  temporaryDirectories.push(projectRoot);
  fs.mkdirSync(path.join(projectRoot, 'src/app'), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, 'src/app/global.css'),
    `@theme inline {
      --color-*: initial;
      --color-text-default: #111;
      --spacing-*: initial;
      --spacing-200: 16px;
      --radius-*: initial;
      --radius-200: 16px;
      --shadow-*: initial;
      --shadow-1: 0 1px 2px #0001;
    }\n`,
  );
  fs.writeFileSync(path.join(projectRoot, 'src/example.tsx'), source);
  return projectRoot;
}

function writeFixtureFile(projectRoot, relativePath, source) {
  const filePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('design lint matcher unit', () => {
  it('finds all four machine-detectable design violations with locations', () => {
    const projectRoot = createFixture(`
      export function Example() {
        return (
          <div className="p-[18px] max-w-[721px] transition-all">
            <button className="rounded-full">Action</button>
          </div>
        );
      }
    `);

    const violations = collectViolations(projectRoot);
    const summary = summarizeViolations(violations);

    assert.deepEqual(summary, {
      'arbitrary-pixel-spacing': { count: 1, fileCount: 1 },
      'raw-styled-button': { count: 1, fileCount: 1 },
      'arbitrary-max-width': { count: 1, fileCount: 1 },
      'transition-all': { count: 1, fileCount: 1 },
      'undefined-theme-utility': { count: 0, fileCount: 0 },
    });
    assert.equal(violations['raw-styled-button'][0].file, 'src/example.tsx');
    assert.equal(violations['raw-styled-button'][0].line, 5);
  });

  it('marks increases and reductions against the baseline separately', () => {
    const summary = {
      'arbitrary-pixel-spacing': { count: 2, fileCount: 1 },
      'raw-styled-button': { count: 0, fileCount: 0 },
      'arbitrary-max-width': { count: 0, fileCount: 0 },
      'transition-all': { count: 0, fileCount: 0 },
      'undefined-theme-utility': { count: 0, fileCount: 0 },
    };
    const baseline = {
      rules: {
        'arbitrary-pixel-spacing': { count: 1, fileCount: 1 },
        'raw-styled-button': { count: 1, fileCount: 1 },
        'arbitrary-max-width': { count: 0, fileCount: 0 },
        'transition-all': { count: 0, fileCount: 0 },
        'undefined-theme-utility': { count: 0, fileCount: 0 },
      },
    };

    const comparisons = compareWithBaseline(summary, baseline);
    assert.equal(comparisons[0].increased, true);
    assert.equal(comparisons[1].decreased, true);
  });

  it('excludes approved structural raw button boundaries', () => {
    const projectRoot = createFixture(`
      export const Screen = () => (
        <>
          <button aria-label="메뉴 닫기" className="fixed inset-0" />
          <button
            aria-label="크기 조절"
            className="cursor-nwse-resize"
            onPointerDown={() => undefined}
          />
        </>
      );
    `);
    const violations = collectViolations(projectRoot);

    assert.deepEqual(violations['raw-styled-button'], []);
  });

  it('exempts only named primitive files, not the common UI directory', () => {
    const projectRoot = createFixture('export const Screen = () => null;\n');
    writeFixtureFile(
      projectRoot,
      'src/components/common/ui/button/index.tsx',
      'export const Button = () => <button className="rounded-100" />;\n',
    );
    writeFixtureFile(
      projectRoot,
      'src/components/common/ui/example.tsx',
      'export const Example = () => <button className="rounded-100" />;\n',
    );

    const violations = collectViolations(projectRoot);

    assert.equal(violations['raw-styled-button'].length, 1);
    assert.equal(
      violations['raw-styled-button'][0].file,
      'src/components/common/ui/example.tsx',
    );
  });

  it('keeps ordinary full-screen and pointer buttons in scope', () => {
    const projectRoot = createFixture(`
      export const Screen = () => (
        <>
          <button aria-label="저장" className="fixed inset-0" />
          <button className="cursor-pointer" onPointerDown={() => undefined} />
        </>
      );
    `);

    const violations = collectViolations(projectRoot);

    assert.equal(violations['raw-styled-button'].length, 2);
  });
});

describe('design lint theme-definition fixtures', () => {
  it('blocks arbitrary variants, templates, constants, and unknown max-width tokens', () => {
    const projectRoot = createFixture(`
      export const ArbitraryVariant = () => (
        <div className="[&>svg]:text-없는토큰" />
      );
    `);
    fs.writeFileSync(
      path.join(projectRoot, 'src/template.tsx'),
      "const active = true; const classes = cn(`w-998 ${active ? 'w-200' : ''}`); export const Template = () => <div className={classes} />;\n",
    );
    fs.writeFileSync(
      path.join(projectRoot, 'src/constant.tsx'),
      "const OUTSIDE_CLASS = 'h-999'; export const Constant = () => <div className={OUTSIDE_CLASS} />;\n",
    );
    fs.writeFileSync(
      path.join(projectRoot, 'src/max-width.tsx'),
      "export const MaxWidth = () => <div className='max-w-없는토큰' />;\n",
    );

    const violations =
      collectViolations(projectRoot)['undefined-theme-utility'];

    process.stdout.write(
      `FIXTURE_EVIDENCE ${JSON.stringify(
        violations.map(({ file, match }) => ({ file, match })),
      )}\n`,
    );

    assert.equal(violations.length, 4);
    assert.deepEqual(violations.map(({ file }) => file).sort(), [
      'src/constant.tsx',
      'src/example.tsx',
      'src/max-width.tsx',
      'src/template.tsx',
    ]);
    assert.match(
      violations.map(({ match }) => match).join('\n'),
      /\[&>svg\]:text-없는토큰/,
    );
    assert.match(violations.map(({ match }) => match).join('\n'), /w-998/);
    assert.match(violations.map(({ match }) => match).join('\n'), /h-999/);
    assert.match(
      violations.map(({ match }) => match).join('\n'),
      /max-w-없는토큰/,
    );
  });
});

describe('design lint CLI integration', () => {
  it('fails above the recorded baseline and passes after the violation is removed', () => {
    const projectRoot = createFixture(
      'export const Example = () => <div className="p-[18px]" />;\n',
    );
    const baselinePath = path.join(
      projectRoot,
      'scripts/design-lint-baseline.json',
    );
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(
      baselinePath,
      `${JSON.stringify({
        version: 1,
        sourceRoot: 'src',
        rules: {
          'arbitrary-pixel-spacing': { count: 0, fileCount: 0 },
          'raw-styled-button': { count: 0, fileCount: 0 },
          'arbitrary-max-width': { count: 0, fileCount: 0 },
          'transition-all': { count: 0, fileCount: 0 },
          'undefined-theme-utility': { count: 0, fileCount: 0 },
        },
      })}\n`,
    );

    const failed = spawnSync(
      process.execPath,
      [SCRIPT_PATH, '--root', projectRoot, '--baseline', baselinePath],
      { encoding: 'utf8' },
    );
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /src\/example\.tsx:1:/);
    assert.match(failed.stderr, /기준선보다 증가/);

    fs.writeFileSync(
      path.join(projectRoot, 'src/example.tsx'),
      'export const Example = () => <div className="p-200" />;\n',
    );

    assert.doesNotThrow(() =>
      execFileSync(
        process.execPath,
        [SCRIPT_PATH, '--root', projectRoot, '--baseline', baselinePath],
        { encoding: 'utf8', stdio: 'pipe' },
      ),
    );
  });
});
