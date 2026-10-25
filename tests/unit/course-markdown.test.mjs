import test from 'node:test';
import assert from 'node:assert/strict';
import { courseMarkdown } from '../../src/lib/course-markdown.js';
import { M } from '../../src/lib/math.js';
import { renderBlock } from '../../src/blocks/index.js';
import { decorate, refsOf } from '../../src/lib/refs.js';
import { strip } from '../../src/lib/util.js';

test('Markdown works in prose, inline fields, table cells and answers', () => {
  assert.match(M('**Voltage** and *current*'), /<strong>Voltage<\/strong> and <em>current<\/em>/);
  const prose = renderBlock({ t: 'p', h: 'First paragraph.\n\nSecond **paragraph**.\n\n- One\n- Two' }, {});
  assert.match(prose, /<p>First paragraph\.<\/p>/);
  assert.match(prose, /<p>Second <strong>paragraph<\/strong>\.<\/p>/);
  assert.match(prose, /<ul>\s*<li>One<\/li>/);
  assert.match(M(renderBlock({ t: 'table', head: ['**Input**'], rows: [['*Value*']] }, {})), /<th><strong>Input<\/strong><\/th>/);
  assert.equal(strip('**Heading** and `code`'), 'Heading and code');
});

test('legacy markup, custom references and TeX retain their meaning', () => {
  const old = '<p class="ink-info">A <strong>claim</strong>.</p>';
  assert.equal(courseMarkdown(old), old);
  assert.equal(courseMarkdown('<m>x_1*y_2</m>'), '<m>x_1*y_2</m>');
  const rendered = decorate('[Earlier](#s1-1) and **<c k="power">power</c>**: <m>x_1*y_2</m>', 'demo', {});
  assert.match(rendered, /href="#\/demo\/s1-1"/);
  assert.match(rendered, /href="#\/demo\/c\/power"/);
  assert.match(rendered, /class="katex"/);
  assert.deepEqual(refsOf({ h: '[Earlier](#s1-1)' }), [{ kind: 'sub', id: 's1-1' }]);
});

test('code spans and fences preserve literal Markdown, tags and math', () => {
  for (const source of ['`<m>x_1</m> **literal**`', '```js\nconst x = "<m>x_1</m> **literal**";\n```']) {
    const rendered = M(source);
    assert.match(rendered, /&lt;m&gt;x_1&lt;\/m&gt; \*\*literal\*\*/);
    assert.doesNotMatch(rendered, /class="katex"|<strong>/);
  }
  const escaped = M(renderBlock({ t: 'p', h: '\\*literal\\* and **emphasis**' }, {}));
  assert.match(escaped, /&#42;literal&#42; and <strong>emphasis<\/strong>/);
});

test('source line wrapping stays soft while explicit breaks and paragraphs survive', () => {
  for (const source of ['First phrase\ncontinues here.', '**First phrase**\n*continues here.*',
    '<p>First phrase\ncontinues here.</p>']) {
    assert.doesNotMatch(courseMarkdown(source), /<br\s*\/?>/);
    assert.match(courseMarkdown(source), /\n/);
  }
  assert.match(courseMarkdown('First paragraph.\n\nSecond paragraph.'), /<\/p>\n<p>/);
  for (const source of ['First<br>Second', 'First  \nSecond', 'First\\\nSecond'])
    assert.match(courseMarkdown(source), /<br\s*\/?>/);
  assert.match(courseMarkdown('```\nfirst\nsecond\n```'), /first\nsecond/);
});

test('circuit derivatives repair split math boundaries and render as complete fractions', () => {
  for (const source of ['dv/<m>dt=6t+2</m>', 'di/<m>dt=4-6t</m>',
    'Ldi/d<m>t=10</m>', '<m>dv_C/dt=14</m>', '<m>i_C=C\\,dv_C/dt</m>']) {
    const rendered = M(source);
    assert.match(rendered, /<mfrac>/);
    assert.doesNotMatch(rendered, /katex-error|(?:dv|di)\//);
  }
  assert.doesNotMatch(M('`dv/<m>dt=14</m>`'), /class="katex"/);
  assert.doesNotMatch(M('A route is dv/dt; voltage times capacitance is vC.'), /class="katex"/);
});
