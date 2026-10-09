#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
]);
const RAW_BUTTON_FILE_ALLOWLIST = new Set([
  // Canonical Button primitive owns the native button boundary.
  'src/components/common/ui/button/index.tsx',
  // ChipButton is a dedicated compact toggle-button primitive.
  'src/components/common/ui/chip/chip-button.tsx',
  // Disclosure header requires the native button's expanded-state contract.
  'src/components/common/ui/disclosure/index.tsx',
  // FilterPillButton is a dedicated filter-trigger button primitive.
  'src/components/common/ui/filters/filter-pill-button.tsx',
  // ViewModeToggle owns a grouped set of icon-only toggle buttons.
  'src/components/common/ui/filters/view-mode-toggle.tsx',
  // The develop-compatible image preview owns its remove control locally.
  'src/components/common/ui/image-upload-input.tsx',
  // List.Item supports both static and native interactive item boundaries.
  'src/components/common/ui/list/index.tsx',
  // OAuthButton is a provider-branded button primitive with its own variants.
  'src/components/common/ui/oauth-button/index.tsx',
  // Pagination owns page and navigation button semantics as one primitive.
  'src/components/common/ui/pagination/index.tsx',
  // StatItem conditionally owns its native interactive statistic boundary.
  'src/components/common/ui/stat-item.tsx',
  // Tabs owns native tab buttons and their roving-focus behavior.
  'src/components/common/ui/tabs/index.tsx',
  // TextActionButton is a dedicated text-only button primitive.
  'src/components/common/ui/text-action-button.tsx',
]);

export const RULES = [
  {
    id: 'arbitrary-pixel-spacing',
    label: '임의 픽셀 간격',
    pattern:
      /(?<![\w-])(?:p[trblxy]?|m[trblxy]?|gap(?:-[xy])?|space-[xy])-\[(?:\d+(?:\.\d+)?|\.\d+)px\]/g,
  },
  {
    id: 'raw-styled-button',
    label: '공용 Button 대신 사용한 스타일 원시 button',
  },
  {
    id: 'arbitrary-max-width',
    label: '일회용 max-w 임의값',
    pattern: /(?<![\w-])max-w-\[[^\]\r\n]+\]/g,
  },
  {
    id: 'transition-all',
    label: 'transition-all',
    pattern: /(?<![\w-])transition-all(?![\w-])/g,
  },
  {
    id: 'undefined-theme-utility',
    label: '@theme에 정의되지 않아 CSS가 방출되지 않는 유틸리티',
  },
];

const SPACING_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'ps',
  'pe',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'ms',
  'me',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'w',
  'h',
  'size',
  'min-w',
  'min-h',
  'max-h',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-x',
  'inset-y',
  'start',
  'end',
  'translate-x',
  'translate-y',
  'scroll-m',
  'scroll-p',
  'basis',
  'indent',
];
const COLOR_PREFIXES = [
  'bg',
  'text',
  'border',
  'fill',
  'stroke',
  'ring',
  'outline',
  'shadow',
  'from',
  'to',
  'via',
  'placeholder',
  'divide',
  'decoration',
  'accent',
  'caret',
  'border-t',
  'border-b',
  'border-l',
  'border-r',
  'border-x',
  'border-y',
  'border-s',
  'border-e',
  'ring-offset',
];
const STATIC_VALUES = new Set([
  'full',
  'auto',
  'none',
  'screen',
  'min',
  'max',
  'fit',
  'px',
  'dvh',
  'dvw',
  'svh',
  'lvh',
  'current',
  'transparent',
  'inherit',
  'initial',
  'unset',
]);
const NON_COLOR_VALUE =
  /^(linear|gradient|radial|conic)-to-|^(no-repeat|repeat|repeat-x|repeat-y|repeat-round|repeat-space|cover|contain|auto|fixed|local|scroll|origin-\w+|clip-\w+|blend-\w+|top|bottom|left|right|center)$|^mode-(none|forwards|backwards|both)$/;
const NON_COLOR_STATIC_VALUES = new Set([
  'b',
  't',
  'l',
  'r',
  'x',
  'y',
  's',
  'e',
  'collapse',
  'separate',
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
]);
const DEFAULT_CONTAINER_VALUES = new Set([
  '3xs',
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'prose',
]);
const DEFAULT_BREAKPOINT_VALUES = new Set([
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
]);
const UNCHECKED_PREFIXES = new Set(['font', 'leading', 'tracking']);

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function parseArguments(argv) {
  const options = {
    projectRoot: DEFAULT_PROJECT_ROOT,
    baselinePath: undefined,
    updateBaseline: false,
    summaryOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') {
      options.projectRoot = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--baseline') {
      options.baselinePath = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--update-baseline') {
      options.updateBaseline = true;
    } else if (argument === '--summary') {
      options.summaryOnly = true;
    } else {
      throw new Error(`알 수 없는 옵션: ${argument}`);
    }
  }

  options.baselinePath ??= path.join(
    options.projectRoot,
    'scripts/design-lint-baseline.json',
  );
  return options;
}

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (IGNORED_DIRECTORIES.has(entry.name)) return [];

      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) return [];
      return [entryPath];
    })
    .sort();
}

function getLineAndColumn(source, index) {
  const beforeMatch = source.slice(0, index);
  const line = beforeMatch.split('\n').length;
  const previousNewline = beforeMatch.lastIndexOf('\n');
  return {
    line,
    column: index - previousNewline,
  };
}

function createViolation({ ruleId, relativePath, line, column, match }) {
  return { ruleId, file: relativePath, line, column, match };
}

function collectPatternViolations({ source, relativePath, ruleId, pattern }) {
  const violations = [];
  for (const match of source.matchAll(pattern)) {
    const location = getLineAndColumn(source, match.index);
    violations.push(
      createViolation({
        ruleId,
        relativePath,
        ...location,
        match: match[0],
      }),
    );
  }
  return violations;
}

function collectRawButtonViolations({ source, relativePath, filePath }) {
  if (RAW_BUTTON_FILE_ALLOWLIST.has(relativePath)) return [];
  if (!['.jsx', '.tsx'].includes(path.extname(filePath))) return [];

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];

  function visit(node) {
    const isOpeningButton =
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sourceFile) === 'button';

    if (isOpeningButton) {
      const className = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) && attribute.name.text === 'className',
      );

      const ariaLabel = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.text === 'aria-label' &&
          attribute.initializer &&
          ts.isStringLiteral(attribute.initializer),
      );
      const onPointerDown = node.attributes.properties.some(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.text === 'onPointerDown',
      );
      const classNameText = className?.initializer?.getText(sourceFile) ?? '';
      const ariaLabelText =
        ariaLabel &&
        ts.isJsxAttribute(ariaLabel) &&
        ariaLabel.initializer &&
        ts.isStringLiteral(ariaLabel.initializer)
          ? ariaLabel.initializer.text
          : '';
      // A full-screen dismiss surface is structural modal chrome, not a visual Button.
      const isDismissBackdrop =
        classNameText.includes('inset-0') && ariaLabelText.includes('닫기');
      // A pointer-driven resize handle is a drag affordance, not a click action.
      const isPointerResizeHandle =
        onPointerDown && /cursor-[\w-]*resize/.test(classNameText);

      if (className && !isDismissBackdrop && !isPointerResizeHandle) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push(
          createViolation({
            ruleId: 'raw-styled-button',
            relativePath,
            line: location.line + 1,
            column: location.character + 1,
            match: '<button ... className=...>',
          }),
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function createThemeContext(projectRoot) {
  const cssPath = path.join(projectRoot, 'src/app/global.css');
  if (!fs.existsSync(cssPath)) return undefined;

  const css = fs.readFileSync(cssPath, 'utf8');
  const definedTokens = (namespace) =>
    new Set(
      [
        ...css.matchAll(
          new RegExp(
            `^\\s*--${namespace}-([a-zA-Z0-9][a-zA-Z0-9._-]*)\\s*:`,
            'gm',
          ),
        ),
      ].map((match) => match[1]),
    );
  const isReset = (namespace) =>
    new RegExp(`^\\s*--${namespace}-\\*\\s*:\\s*initial`, 'm').test(css);

  return {
    tokens: {
      color: definedTokens('color'),
      container: definedTokens('container'),
      radius: definedTokens('radius'),
      shadow: definedTokens('shadow'),
      spacing: definedTokens('spacing'),
    },
    reset: {
      color: isReset('color'),
      radius: isReset('radius'),
      shadow: isReset('shadow'),
      spacing: isReset('spacing'),
    },
    customUtilities: new Set(
      [...css.matchAll(/^@utility\s+([a-zA-Z0-9][a-zA-Z0-9._/-]*)/gm)].map(
        (match) => match[1],
      ),
    ),
    shadcnOnly: new Set(
      [...css.matchAll(/^\s*--([a-z][a-z0-9-]*)\s*:/gm)]
        .map((match) => match[1])
        .filter(
          (name) =>
            !/^(color|radius|spacing|shadow|text|font|breakpoint|container|tracking|leading|ease|animate|blur|perspective|aspect|default)-/.test(
              name,
            ),
        ),
    ),
  };
}

function stripVariants(className) {
  let base = className;
  for (;;) {
    let bracketDepth = 0;
    let separator = -1;
    for (let index = 0; index < base.length; index += 1) {
      if (base[index] === '[') bracketDepth += 1;
      else if (base[index] === ']')
        bracketDepth = Math.max(0, bracketDepth - 1);
      else if (base[index] === ':' && bracketDepth === 0) {
        separator = index;
        break;
      }
    }
    if (separator === -1) return base;
    base = base.slice(separator + 1);
  }
}

function isStaticSpacingValue(value) {
  return (
    STATIC_VALUES.has(value) ||
    /^\d+\/\d+$/.test(value) ||
    /^(screen|dvh|dvw|svh|lvh|svw|lvw)$/.test(value)
  );
}

function findLongestPrefix(value, prefixes) {
  return prefixes
    .filter((prefix) => value.startsWith(`${prefix}-`))
    .sort((left, right) => right.length - left.length)[0];
}

function checkThemeUtility(className, theme) {
  let base = stripVariants(className);
  base = base.replace(/^[-!]+/, '').replace(/!$/, '');
  if (!base || base.includes('[') || theme.customUtilities.has(base)) {
    return undefined;
  }

  const slashIndex = base.indexOf('/');
  const core = slashIndex === -1 ? base : base.slice(0, slashIndex);
  if (
    UNCHECKED_PREFIXES.has(findLongestPrefix(core, [...UNCHECKED_PREFIXES]))
  ) {
    return undefined;
  }

  const spacingPrefix = findLongestPrefix(core, SPACING_PREFIXES);
  const colorPrefix = findLongestPrefix(core, COLOR_PREFIXES);

  if (core.startsWith('max-w-')) {
    const value = base.slice('max-w-'.length);
    if (!value || isStaticSpacingValue(value)) return undefined;
    if (/^\d+(?:\.\d+)?$/.test(value)) {
      return theme.reset.spacing && !theme.tokens.spacing.has(value)
        ? `max-width 토큰 미정의: --spacing-${value} 없음 (CSS 미방출)`
        : undefined;
    }
    if (
      theme.tokens.container.has(value) ||
      DEFAULT_CONTAINER_VALUES.has(value) ||
      (value.startsWith('screen-') &&
        DEFAULT_BREAKPOINT_VALUES.has(value.slice('screen-'.length)))
    ) {
      return undefined;
    }
    return `max-width 토큰 미정의: --container-${value} 없음 (CSS 미방출)`;
  }

  if (
    spacingPrefix &&
    (!colorPrefix || spacingPrefix.length >= colorPrefix.length)
  ) {
    const value = base.slice(spacingPrefix.length + 1);
    if (!value || isStaticSpacingValue(value) || !/^[0-9]/.test(value)) {
      return undefined;
    }
    return theme.reset.spacing && !theme.tokens.spacing.has(value)
      ? `spacing 토큰 미정의: --spacing-${value} 없음 (CSS 미방출)`
      : undefined;
  }

  if (core === 'rounded' || core.startsWith('rounded-')) {
    const value = core === 'rounded' ? '' : core.slice('rounded-'.length);
    const sidedValue = value.match(
      /^(t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee)-(.*)$/,
    );
    const token = sidedValue ? sidedValue[2] : value;
    if (STATIC_VALUES.has(token)) return undefined;
    if (token === '') {
      return "radius 토큰 미정의: bare 'rounded'는 기본 스케일 리셋으로 소멸";
    }
    return theme.reset.radius && !theme.tokens.radius.has(token)
      ? `radius 토큰 미정의: --radius-${token} 없음 (CSS 미방출)`
      : undefined;
  }

  if (core.startsWith('shadow-') || core === 'shadow') {
    const value = core === 'shadow' ? '' : core.slice('shadow-'.length);
    if (
      STATIC_VALUES.has(value) ||
      theme.tokens.shadow.has(value) ||
      theme.tokens.color.has(value)
    ) {
      return undefined;
    }
    return theme.reset.shadow
      ? `shadow 토큰 미정의: --shadow-${value || '(bare)'} 없음 (CSS 미방출)`
      : undefined;
  }

  if (colorPrefix) {
    const value = core.slice(colorPrefix.length + 1);
    if (
      !value ||
      STATIC_VALUES.has(value) ||
      NON_COLOR_VALUE.test(value) ||
      NON_COLOR_STATIC_VALUES.has(value) ||
      theme.tokens.color.has(value) ||
      !theme.reset.color ||
      /^\d+$/.test(value) ||
      /^(center|left|right|justify|start|end|nowrap|wrap|balance|pretty|ellipsis|clip|solid|dashed|dotted|double|hidden|inset|offset|opacity)$/.test(
        value,
      )
    ) {
      return undefined;
    }
    if (theme.shadcnOnly.has(value)) {
      return `색 토큰 미등록: --${value}가 @theme에 없어 유틸이 생성되지 않음`;
    }
    return `색 토큰 미정의: --color-${value} 없음 (CSS 미방출)`;
  }

  return undefined;
}

function collectThemeUtilityViolations({
  source,
  relativePath,
  filePath,
  theme,
}) {
  if (!theme || /\.(test|spec|stories)\.[jt]sx?$/.test(filePath)) return [];

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];

  const isClassContext = (node) => {
    let current = node;
    while (current.parent) {
      const parent = current.parent;
      if (ts.isJsxAttribute(parent)) {
        return /class/i.test(parent.name.getText(sourceFile));
      }
      if (ts.isCallExpression(parent)) {
        const callee = parent.expression.getText(sourceFile);
        if (/^(cn|clsx|cva)$/.test(callee)) return true;
      }
      if (
        ts.isTaggedTemplateExpression(parent) &&
        parent.tag.getText(sourceFile) === 'tw'
      ) {
        return true;
      }
      if (ts.isFunctionLike(parent)) return false;
      if (ts.isVariableDeclaration(parent))
        return parent.initializer === current;
      if (ts.isStatement(parent) || ts.isSourceFile(parent)) return false;
      current = parent;
    }
    return false;
  };

  const scanLiteral = (content, node) => {
    if (!isClassContext(node)) return;
    const location = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    for (const className of content.split(/\s+/)) {
      if (
        !className ||
        className.length > 120 ||
        !/^[a-zA-Z@![/-]/.test(className)
      ) {
        continue;
      }
      const reason = checkThemeUtility(className, theme);
      if (reason) {
        violations.push(
          createViolation({
            ruleId: 'undefined-theme-utility',
            relativePath,
            line: location.line + 1,
            column: location.character + 1,
            match: `${className} (${reason})`,
          }),
        );
      }
    }
  };

  const visit = (node) => {
    if (ts.isTemplateExpression(node)) {
      scanLiteral(node.head.text, node.head);
      for (const span of node.templateSpans) {
        visit(span.expression);
        scanLiteral(span.literal.text, span.literal);
      }
      return;
    }
    if (ts.isStringLiteralLike(node)) scanLiteral(node.text, node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

export function collectViolations(projectRoot) {
  const sourceRoot = path.join(projectRoot, 'src');
  const violations = Object.fromEntries(RULES.map((rule) => [rule.id, []]));
  const theme = createThemeContext(projectRoot);

  for (const filePath of collectSourceFiles(sourceRoot)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const relativePath = normalizePath(path.relative(projectRoot, filePath));

    for (const rule of RULES) {
      if (!rule.pattern) continue;
      violations[rule.id].push(
        ...collectPatternViolations({
          source,
          relativePath,
          ruleId: rule.id,
          pattern: rule.pattern,
        }),
      );
    }

    violations['raw-styled-button'].push(
      ...collectRawButtonViolations({ source, relativePath, filePath }),
    );
    violations['undefined-theme-utility'].push(
      ...collectThemeUtilityViolations({
        source,
        relativePath,
        filePath,
        theme,
      }),
    );
  }

  return violations;
}

export function summarizeViolations(violations) {
  return Object.fromEntries(
    RULES.map((rule) => {
      const ruleViolations = violations[rule.id];
      return [
        rule.id,
        {
          count: ruleViolations.length,
          fileCount: new Set(ruleViolations.map((violation) => violation.file))
            .size,
        },
      ];
    }),
  );
}

export function compareWithBaseline(summary, baseline) {
  return RULES.map((rule) => {
    const current = summary[rule.id];
    const expected = baseline.rules[rule.id];
    if (!expected) {
      throw new Error(`기준선에 규칙이 없습니다: ${rule.id}`);
    }

    return {
      ...rule,
      current,
      expected,
      increased:
        current.count > expected.count ||
        current.fileCount > expected.fileCount,
      decreased:
        current.count < expected.count ||
        current.fileCount < expected.fileCount,
    };
  });
}

function writeBaseline(baselinePath, summary) {
  const baseline = {
    version: 1,
    sourceRoot: 'src',
    rules: summary,
  };
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(`${baselinePath}`, `${JSON.stringify(baseline, null, 2)}\n`);
}

function printResults(comparisons, violations, summaryOnly) {
  console.log('ZERO-ONE design lint baseline');
  for (const comparison of comparisons) {
    const status = comparison.increased
      ? 'FAIL'
      : comparison.decreased
        ? 'DOWN'
        : 'OK';
    console.log(
      `[${status}] ${comparison.id}: ${comparison.current.count}건/${comparison.current.fileCount}파일 (기준 ${comparison.expected.count}건/${comparison.expected.fileCount}파일)`,
    );

    if (summaryOnly) continue;
    for (const violation of violations[comparison.id]) {
      console.log(
        `  ${violation.file}:${violation.line}:${violation.column}  ${violation.match}`,
      );
    }
  }
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const violations = collectViolations(options.projectRoot);
  const summary = summarizeViolations(violations);

  if (options.updateBaseline) {
    writeBaseline(options.baselinePath, summary);
    console.log(`디자인 기준선을 갱신했습니다: ${options.baselinePath}`);
    return 0;
  }

  if (!fs.existsSync(options.baselinePath)) {
    throw new Error(
      `디자인 기준선이 없습니다: ${options.baselinePath}\n` +
        '`yarn design:lint --update-baseline`로 검토 후 생성하세요.',
    );
  }

  const baseline = JSON.parse(fs.readFileSync(options.baselinePath, 'utf8'));
  const comparisons = compareWithBaseline(summary, baseline);
  printResults(comparisons, violations, options.summaryOnly);

  const increased = comparisons.filter((comparison) => comparison.increased);
  const decreased = comparisons.filter((comparison) => comparison.decreased);
  if (increased.length > 0) {
    console.error(
      `디자인 부채가 기준선보다 증가했습니다: ${increased.map(({ id }) => id).join(', ')}`,
    );
    return 1;
  }

  if (decreased.length > 0) {
    console.log(
      '디자인 부채가 줄었습니다. 변경을 검토한 뒤 `yarn design:lint --update-baseline`로 기준선을 낮추세요.',
    );
  }
  console.log('디자인 부채가 기준선보다 늘지 않았습니다.');
  return 0;
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
