import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightCode } from '../../src/lib/code-highlight.js';
import { courseMarkdown } from '../../src/lib/course-markdown.js';
import { renderBlock, setBlockConfig } from '../../src/blocks/index.js';

test('language names and aliases select standard grammars', () => {
  for (const language of ['python', 'py', 'Python']) {
    const html = highlightCode('def greet(name):\n    return "Hello" # def', language);
    assert.match(html, /class="hljs-keyword">def<\/span>/);
    assert.match(html, /class="hljs-string">&quot;Hello&quot;<\/span>/);
    assert.match(html, /class="hljs-comment"># def<\/span>/);
  }
  assert.match(highlightCode('const x = 42;', 'js'), /class="hljs-keyword">const/);
});

test('unknown or absent languages remain escaped plain text', () => {
  for (const language of [undefined, '', 'unknown-language', 'text', '__proto__']) {
    const html = highlightCode('<script>"x" & y</script>', language);
    assert.doesNotMatch(html, /<script>|<span/);
    assert.match(html, /&lt;script&gt;/);
  }
});

test('dedicated code blocks highlight by language and preserve custom course rules', () => {
  const block = { t: 'code', lang: 'python', src: 'def greet():\n    return "Hello"' };
  try {
    setBlockConfig({});
    assert.match(renderBlock(block, {}), /class="hljs-keyword">def/);
    setBlockConfig({ syntax: { comment: '#', keywords: ['greet'], strings: true } });
    const html = renderBlock(block, {});
    assert.match(html, /class="tok-k">greet/);
    assert.match(html, /class="tok-s">"Hello"/);
    assert.doesNotMatch(html, /hljs-/);
  } finally { setBlockConfig({}); }
});

test('Markdown fences use language grammars without changing inline code or interpreting source HTML', () => {
  for (const fence of ['```', '~~~']) {
    const html = courseMarkdown(`${fence}python example\ndef greet():\n    return "<m>x_1</m> **literal**"\n${fence}`);
    assert.match(html, /class="language-python"/);
    assert.match(html, /class="hljs-keyword">def/);
    assert.match(html, /&lt;m&gt;x_1&lt;\/m&gt; \*\*literal\*\*/);
    assert.doesNotMatch(html, /<m>|<strong>/);
  }
  assert.equal(courseMarkdown('`def greet():`'), '<code>def greet():</code>');
  assert.doesNotMatch(courseMarkdown('```unknown\n<script>alert(1)</script>\n```'), /<script>|hljs-/);
  assert.doesNotMatch(courseMarkdown('```python" onclick="evil\ndef f(): pass\n```'), /onclick=/);
});

test('plain fences retain their existing empty and trailing-newline rendering', () => {
  assert.equal(courseMarkdown('```\n```'), '<pre><code></code></pre>\n');
  assert.equal(courseMarkdown('```\nx\n\n```'), '<pre><code>x\n</code></pre>\n');
});
