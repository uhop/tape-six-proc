import assert from 'node:assert';
import test from 'tape-six';

test('Using standard assert', t => {
  t.pass('Pass #1');
  // assert.strict.deepEqual([1], [2], '1 should be equal to 2!');
  assert.strict.equal(1, 1);
  assert.strict.deepEqual([1], [2]);
  t.pass('Pass #2');
});
