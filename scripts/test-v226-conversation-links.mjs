import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'app/_components');
const passes = [];
const check = (label, run) => { run(); passes.push(label); console.log(`PASS - ${label}`); };

function loadTs(relative, deps = {}, tsx = false) {
  const input = readFileSync(resolve(sourceDir, relative), 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(input, {
    fileName: relative,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      ...(tsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
    },
  });
  assert.equal(diagnostics?.length ?? 0, 0);
  const exports = {};
  runInNewContext(outputText, {
    exports,
    URL,
    require: (id) => {
      assert.ok(id in deps, `Unexpected dependency: ${id}`);
      return deps[id];
    },
  });
  return exports;
}

const url = loadTs('conversation-url.ts');
const original = 'https://www.samsung.com/pt/offer/everyday-ai/?utm_source=google&gclid=long-tracking-code';
check('full original Samsung URL is retained as link target', () => {
  assert.equal(url.compactConversationUrl(original).href, original);
});
check('Samsung label preserves meaningful site path, without advertising parameters', () => {
  assert.equal(url.compactConversationUrl(original).label, 'samsung.com/pt/offer/everyday-ai');
});
check('JYSK tracking-heavy URL becomes just the hostname in the label', () => {
  assert.equal(url.compactConversationUrl('https://jysk.pt/?utm_campaign=x&gclid=abcdef').label, 'jysk.pt');
});
check('query arguments with functional meaning remain in the original href', () => {
  const source = 'https://shop.example.com/search?q=sofa&color=black';
  const presentation = url.compactConversationUrl(source);
  assert.equal(presentation.label, 'shop.example.com/search');
  assert.equal(presentation.href, source);
});
check('shortened labels do not exceed 64 characters', () => {
  assert.ok(url.compactConversationUrl(`https://example.com/${'path/'.repeat(80)}`).label.length <= 64);
});
check('unsafe schemes are never made clickable', () => {
  assert.equal(url.compactConversationUrl('javascript:alert(1)').href, null);
});
check('bare domains use HTTPS without losing original pathname', () => {
  const item = url.compactConversationUrl('example.com/catalog/item?id=42');
  assert.equal(item.href, 'https://example.com/catalog/item?id=42');
  assert.equal(item.label, 'example.com/catalog/item');
});

const jsx = (type, props, key) => ({ type, props, key });
const jsxRuntime = { jsx, jsxs: jsx };
const deps = { './conversation-url': url, 'react/jsx-runtime': jsxRuntime };
const component = loadTs('CompactWebsiteLink.tsx', deps, true).default;
const message = loadTs('ConversationMessageText.tsx', deps, true).default;
check('conversation-card website is plain text, avoiding nested links', () => {
  assert.equal(component({ url: original, clickable: false }).type, 'span');
});
check('website detail is clickable with secure external-link attributes', () => {
  const result = component({ url: original });
  assert.equal(result.type, 'a');
  assert.equal(result.props.href, original);
  assert.equal(result.props.rel, 'noopener noreferrer');
});
check('full message is preserved and links get short clickable labels', () => {
  const result = message({ content: `Vê ${original}, obrigado.` });
  const [before, link, comma, ending] = result.props.children;
  assert.equal(before, 'Vê ');
  assert.equal(link.props.href, original);
  assert.equal(link.props.children, 'samsung.com/pt/offer/everyday-ai');
  assert.equal(comma, ',');
  assert.equal(ending, ' obrigado.');
  assert.equal(result.props.style.overflowWrap, 'anywhere');
});

check('URL parentheses are preserved when they are part of the destination', () => {
  const full = 'https://en.wikipedia.org/wiki/Function_(mathematics)';
  const element = message({ content: `Consultar (${full}).` });
  const [, link, trailing] = element.props.children;
  assert.equal(link.props.href, full);
  assert.equal(trailing, ').');
});

for (const file of [
  'app/admin/(dashboard)/conversations/[id]/page.tsx',
  'app/admin/(dashboard)/clients/[id]/conversations/[conversationId]/page.tsx',
  'app/portal/(dashboard)/conversations/[conversationId]/page.tsx',
]) {
  check(`long message rendering enabled in ${file}`, () => {
    assert.match(readFileSync(resolve(root, file), 'utf8'), /<ConversationMessageText content={message\.content}/);
  });
}
check('admin conversation list shows compact website, without altering stored website', () => {
  assert.match(readFileSync(resolve(root, 'app/admin/(dashboard)/conversations/page.tsx'), 'utf8'), /<CompactWebsiteLink/);
});
check('Tailwind border-white/6 fix is preserved', () => {
  assert.match(readFileSync(resolve(root, 'app/legal/page.tsx'), 'utf8'), /border-white\/6/);
});
console.log(`\n${passes.length}/${passes.length} checks passed.`);
