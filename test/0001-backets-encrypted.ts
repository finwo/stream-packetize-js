import { randomBytes } from 'crypto';
import { EventEmitter } from 'node:events';
import { PacketConnection } from '../src';
import { SerialConnectionEventMap } from '../src/types';
import test from 'tape';

type ioBuffer = Buffer[];

class MockConnection extends EventEmitter<SerialConnectionEventMap> {
  constructor(public mappedData: (string|Buffer)[]) {
    super();
  }
  write(chunk: string|Buffer): void {
    this.mappedData.push(chunk);
  }
  close(): void {
    this.emit('close');
  }
}

test('Testing packetization basics', t => {
  const message = Buffer.from("-\xC0\xDB\xDD-", 'ascii');
  const mockedIO: ioBuffer = [];

  const aliceIO: Buffer[] = [];
  const bobIO  : Buffer[] = [];

  const aliceRaw   = new MockConnection(aliceIO);
  const bobRaw     = new MockConnection(bobIO);
  const passphrase = randomBytes(15); // Intentionally not 32bytes/256bit

  const alice = new PacketConnection(aliceRaw, { passphrase });
  const bob   = new PacketConnection(bobRaw, { passphrase });
  const bobRx: Buffer[] = [];

  bob.on('message', chunk => {
    if (!Buffer.isBuffer(chunk)) return;
    bobRx.push(chunk);
  });

  alice.send(message);
  t.equal(aliceIO[0].subarray(1,aliceIO[0].length-1).includes(0xC0), false, 'Packet with markers in data are properly encoded');
  t.notEqual(aliceIO[0].toString('hex'), 'c02ddbdcdbdddd2d99bbc0', 'Packet with markers in data are properly encrypted encoded');

  bobRaw.emit('data', aliceIO.shift() || Buffer.alloc(0));
  t.equal(bobRx.length, 1, 'Wrapped-packet input discards too-short packet');

  t.equal(Buffer.compare(message, bobRx.shift() || Buffer.alloc(0)), 0, 'Packet with markers in data is properly decoded')

  t.end();
});
