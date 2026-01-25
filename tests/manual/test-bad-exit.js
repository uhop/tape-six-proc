import test from 'tape-six';
import process from 'node:process';

test('bad exit', t => {
  t.pass();
  process.exit(1);
});
