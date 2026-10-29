import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { courseFiles, withoutAuthorComments } from '../../tools/lib/files.mjs';
import { parseCourse } from '../../src/lib/parse.js';
import { loadCourse } from '../../tools/lib/load.mjs';

const dir = new URL('../../courses/resume/', import.meta.url).pathname;
const files = () => courseFiles(dir, message => { throw new Error(message); });
const python = source => spawnSync('python3', ['-B', '-c', source], { encoding: 'utf8' });

test('Resume demo imports the authored lessons, bank and embedded lab without private sources', () => {
  const packed = JSON.parse(readFileSync(new URL('../../packed/resume.course.json', import.meta.url), 'utf8'));
  assert.deepEqual(packed, files());
  assert.ok(!Object.keys(packed).some(path => path.startsWith('sources/')));
  const browser = parseCourse(packed), cli = loadCourse(dir);
  assert.deepEqual(browser.errors, []);
  assert.deepEqual(cli.errors, []);
  assert.deepEqual(browser.course.sections, withoutAuthorComments(cli.course.sections));
  const lessons = browser.course.sections.flatMap(section => section.subs);
  assert.deepEqual(lessons.map(sub => sub.id), ['s1-1', 's1-2', 's2-1', 's2-2']);
  assert.equal(lessons.flatMap(sub => sub.quiz).length, 12);
  assert.equal(new Set(lessons.flatMap(sub => sub.blocks).map(block => block.authorId)).size,
    lessons.flatMap(sub => sub.blocks).length);
});

test('Resume Python examples run, and the public exercise detects both a wrong rule and a constant result', () => {
  const { course } = loadCourse(dir);
  const subs = course.sections.flatMap(section => section.subs);
  const source = id => subs.find(sub => sub.id === id).blocks.filter(block => block.t === 'code').map(block => block.src);
  const hello = python(source('s1-1')[0]);
  assert.equal(hello.status, 0, hello.stderr);
  assert.equal(hello.stdout.trim(), 'Hello, resume');
  const trace = python(source('s2-1')[0]);
  assert.equal(trace.status, 0, trace.stderr);
  assert.equal(Number(trace.stdout.trim()), 12);
  const [definition, checks] = source('s2-2');
  const correct = python(definition + '\n' + checks + '\nassert price_cents(5, 6) == 30');
  assert.equal(correct.status, 0, correct.stderr);
  assert.match(correct.stdout, /Public checks passed/);
  for (const faulty of [definition.replace('quantity * unit_cents', 'quantity + unit_cents'),
    definition.replace('quantity * unit_cents', '12')]) {
    const result = python(faulty + '\n' + checks);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AssertionError/);
  }
  const bank = course.questionBank;
  assert.equal(bank['trace-1'].response.value, Number(trace.stdout.trim()));
  assert.equal(bank['trace-2'].response.value, 4 * 7);
  assert.equal(bank['function-1'].response.value, 6 * 8);
});
