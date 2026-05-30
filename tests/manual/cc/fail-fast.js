import test from 'tape-six';

// Fails immediately. Under failOnce (flag O) this sets stopTest, which the
// parent turns into a `terminate` for every slow sibling still in flight.
test('fast failing test', t => {
  t.fail('boom — triggers failOnce');
});
