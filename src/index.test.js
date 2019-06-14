const through = require('through'),
      nagle   = require('stream-nagle'),
      packetize = require('./index');

test('Small package (default)', async () => {

  // Pipe through nagle to change data events
  let tx   = packetize.encode();
  let rx   = tx.pipe(nagle({aggressive:true})).pipe(packetize.decode());
  let done = false;

  rx.on('data', function(chunk) {
    expect(chunk.toString()).toBe('Hello World');
    done = true;
  });

  // Write twice to trigger nagle
  tx.write('Hello World');
  tx.write('Hello World');

  // Wait for data to pass
  while(!done) await new Promise(r=>setTimeout(r,50));
});
