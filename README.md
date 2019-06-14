# stream-packetize

> Ensure the same data-events on both ends

[![NPM](https://nodei.co/npm/stream-packetize.png)](https://nodei.co/npm/stream-packetize/)

---

## Warning

This package modifies the data on the wire. Either both or no sides need to be using this package to ensure correct
behavior.

## Why

Streams in javascript may pass through a number of systems which aren't aware of data events. If your application relies
on separate `data` events from a stream to separate instances, it may break due to a pipe, a slow network path, or any
other medium that isn't packet-aware.

This package ensures the `data` events on both ends match, so you can rely on separate `data` events again.

## Usage

Streams are handled by implementing `.write` and `data`/`end` events. This should suffice to be compatible with most
frameworks or packages while keeping this library small and to-the-point.

```js
const packetize = require('stream-packetize'),
      nagle     = require('stream-nagle');

// Initialize the encoder
let sender = packetize.encode();

// Initialize the decoder
// Nagle used as an example of modified data timing
let receiver = sender.pipe(nagle()).pipe(packetize.decode());

// Print to console what was received
receiver.on('data', function(chunk) {
  console.log('Message:',chunk.toString());
});

// Writes 'Message: Hello World' twice
sender.write('Hello World');
sender.write('Hello World');

// Example without packetize:
let nagleStream = nagle();

// Print what was received again
nagleStream.on('data', function(chunk) {
  console.log('Message:',chunk.toString());
});

// Prints: 'Message: Hello WorldHello World'
nagleStream.write('Hello World');
nagleStream.write('Hello World');
```
