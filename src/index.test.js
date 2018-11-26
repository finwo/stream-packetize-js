const through = require('through'),
      nagle   = require('stream-nagle'),
      packetize = require('./index');

test('Small package (default)', async () => {

  // Pipe through nagle to change data events
  let tx = packetize.encode();
  let rx = tx.pipe(nagle({aggressive:true})).pipe(packetize.decode());

  rx.on('data', function(chunk) {
    expect(chunk.toString()).toBe('Hello World');
  });

  // Write twice to trigger nagle
  tx.write('Hello World');
  tx.write('Hello World');
});

test('Small package (base64)', async () => {

  // Pipe through nagle to change data events
  let tx = packetize.encode({base64:true});
  let rx = tx.pipe(nagle({aggressive:true})).pipe(packetize.decode());

  rx.on('data', function(chunk) {
    expect(chunk.toString()).toBe('Hello World');
  });

  // Write twice to trigger nagle
  tx.write('Hello World');
  tx.write('Hello World');
});
