import test from 'tape-six';

test('bails out', t => {
  t.pass('before');
  t.bailOut('deliberate bail-out');
});
