import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLabel } from '../../src/lib/source-label.js';

test('source labels retain filenames and locators without local user paths', () => {
  assert.equal(sourceLabel('/Users/example/My Course/sources/Book with spaces.pdf §2, pp. 4–5'), 'Book with spaces.pdf §2, pp. 4–5');
  assert.equal(sourceLabel('C:\\Users\\example\\sources\\volume-2\\Book.pdf p. 8'), 'volume-2/Book.pdf p. 8');
  assert.equal(sourceLabel('file:///home/example/sources/Book.pdf'), 'Book.pdf');
  assert.equal(sourceLabel('/home/example/Book.pdf §1'), 'Book.pdf §1');
  assert.equal(sourceLabel('sources/Book.pdf p. 12'), 'Book.pdf p. 12');
  assert.equal(sourceLabel('https://example.org/sources/Book.pdf'), 'https://example.org/sources/Book.pdf');
  assert.equal(sourceLabel('OpenStax Calculus, Section 2.1'), 'OpenStax Calculus, Section 2.1');
  assert.equal(sourceLabel('<strong>Reference</strong> <m>x</m>'), '<strong>Reference</strong> <m>x</m>');
});
