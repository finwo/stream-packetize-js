# stream-packetize

<small>Packetize data streams</small>

## Warning

This package modifies the data on the wire. Either both or no sides need to be using this package to ensure correct
behavior.

Version 2.0.0 and higher are **NOT** compatible with earlier versions, as this library moved from an unchecked
prefix-code towards [slip](https://wikipedia.org/wiki/Serial_Line_Internet_Protocol)-like packetization with an added
[CRC-16/XMODEM](https://crccalc.com/?crc=Hi!&method=CRC-16/XMODEM&datatype=ascii&outtype=hex) added on top.

## Why

Streams in javascript may pass through a number of systems which aren't aware of data events. If your application relies
on separate `data` events from a stream to separate instances, it may break due to a pipe, a slow network path, or any
other medium that isn't packet-aware.

This package ensures the `data` events on both ends match, so you can rely on separate `data` events again.

## Usage

This library wraps around a stream-like object (like a tcp stream or serial port connection), and provides a
websocket-like interface.

### Wrapping a stream

So, to wrap a connection, you simple create a new PacketConnection instance with the stream as it's argument.

```ts
import { PacketConnection } from 'stream-packetize';
// Or
import PacketConnection from 'stream-packetize';

// Open up a serial port
import { SerialPort } from 'serialport';
const port = new SerialPort({
  path: '/dev/ttyUSB1',
  baudRate: 57600,
})

// Packetize a serial port
const packeted = new PacketConnection(port);

// Or start tcp server
import { createServer } from 'node:net';
const server = createServer();
server.listen(8080, () => {
  console.log('Listening on :8080');
});
server.on('connection', sock => {

  // Packetize a tcp connection
  const packeted = new PacketConnection(sock);

});
```

### Sending/receiving data

The interface provided is based upon the [ws](https://npmjs.com/ws) package, and
provides the following methods and events:

```typescript
.send(chunk: string|Buffer): void;
.end(chunk?: string|Buffer): void;
.on('message', (string|Buffer)=>void);
.on('close', (string|Buffer)=>void);
```
