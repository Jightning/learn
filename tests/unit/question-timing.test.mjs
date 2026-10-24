import test from 'node:test';
import assert from 'node:assert/strict';
import { beginTiming, timingSnapshot, effectiveTiming, validateTiming, timingClock } from '../../src/lib/question-timing.js';

test('strict timing survives serialization, expiry and backward wall clocks without regaining time', () => {
  const timing = beginTiming({ limitSeconds: 60 }, 1000);
  const saved = JSON.parse(JSON.stringify(timingSnapshot(timing, 31000)));
  assert.equal(saved.remainingMs, 30000);
  const back = timingSnapshot(saved, 2000);
  assert.equal(back.remainingMs, 30000); assert.equal(back.valid, false);
  assert.equal(timingSnapshot(back, 62000).enforce, true);
  assert.equal(timingSnapshot(back, 62000).valid, false);
});
test('pacing is informative, accommodations apply and total limits bound item limits', () => {
  assert.equal(timingSnapshot(beginTiming({ limitSeconds: 1, mode: 'pacing' }, 0), 2000).enforce, false);
  const total = beginTiming({ limitSeconds: 20, multiplier: 2 }, 0);
  const item = beginTiming({ limitSeconds: 60 }, 30000);
  assert.equal(effectiveTiming(item, total, 35000).remainingMs, 5000);
  assert.equal(effectiveTiming(item, total, 40000).enforce, true);
});
test('invalid timing fails before beginning a run', () => {
  for (const value of [{limitSeconds:0}, {limitSeconds:Infinity}, {limitSeconds:1,mode:'pause'}, {limitSeconds:1, extra:true}]) {
    const errors = []; validateTiming(value, 'question', errors); assert.equal(errors.length, 1);
  }
  assert.throws(() => beginTiming({limitSeconds:2,multiplier:0}));
  assert.throws(() => timingSnapshot({version:1,startedAt:2,deadlineAt:1}, 3));
});
test('within-page timing uses monotonic elapsed time and invalidates wall-clock jumps', () => {
  const read = timingClock(10000, 100);
  assert.deepEqual(read(11000, 1100), {now:11000,valid:true});
  assert.deepEqual(read(100000, 2100), {now:12000,valid:false});
  assert.deepEqual(read(13000, 3100), {now:13000,valid:false});
});
