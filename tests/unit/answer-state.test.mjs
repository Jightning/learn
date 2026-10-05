import assert from 'node:assert/strict';
import test from 'node:test';
import { stateFor, forget } from '../../src/lib/state.js';
import { rebuild } from '../../src/lib/replay.js';

test('local lesson attempts survive state reload and scheduling replay', () => {
  const course = {code:'ANSWER TEST', state:{}, retention:{}};
  const state = stateFor('answer-test', course);
  const attempt = {signature:'key', value:[1,3], feedback:{correct:true, recorded:true}};
  state.rate('q', null, true);
  state.saveAttempt('q', attempt);
  forget('answer-test');
  assert.deepEqual(stateFor('answer-test', course).getAttempt('q', 'key'), attempt);
  assert.equal(stateFor('answer-test', course).getAttempt('q', 'changed'), null);
  rebuild('answer-test', course);
  assert.deepEqual(stateFor('answer-test', course).getAttempt('q', 'key'), attempt);
  stateFor('answer-test', course).reset();
  assert.equal(stateFor('answer-test', course).getAttempt('q', 'key'), null);
});

test('disabled course state does not retain attempts', () => {
  const state = stateFor('answers-off', {state:{enabled:false}});
  state.saveAttempt('q', {signature:'key', value:1});
  assert.equal(state.getAttempt('q', 'key'), null);
});
