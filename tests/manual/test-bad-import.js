import test from 'tape-six';

import x from 'bad-import';

test('non-working test', t => {
  t.ok(typeof x === 'object');
});
