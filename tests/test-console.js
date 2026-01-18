import test from 'tape-six';

test('console test', t => {
  console.log('#1');
  t.pass();
  console.log('#2');
  console.error('error #1');
  console.log('#2a');
  t.ok(1 < 2);
  console.log('#3');
  console.error('error #2');
});
