// Turns a stream connection into a packet-based connection
// Only intended for point-to-point packets, no routing here
// Packets are only decoded from a 1MiB window to prevent memory leaks

// Structure:
//   Packets are encoded like SLIP: https://en.wikipedia.org/wiki/Serial_Line_Internet_Protocol
//   A CRC16 is added to add minor validation (and discarding invalid packets, like ethernet)

import { EventEmitter } from 'node:events';
import { crc16 } from '@finwo/crc16-xmodem';
import { StreamConnection } from './types';
export * from './types';

const defaultPacketWindow = 2**20; // 1MiB
const FRAME_END           = 0xC0;
const FRAME_ESC           = 0xDB;

const encodeTable: [number,Buffer][] = [
  [FRAME_ESC, Buffer.from([FRAME_ESC, 0xDD])],
  [FRAME_END, Buffer.from([FRAME_ESC, 0xDC])],
];

const decodeTable = [];
decodeTable[0xDC] = Buffer.from([FRAME_END]); // Transposed frame end
decodeTable[0xDD] = Buffer.from([FRAME_ESC]); // Transposed frame escape

interface PacketConnectionEventMap {
  message: [string|Buffer];
  close: [];
};

export type PacketConnectionOptions = {
  packetWindow: number;
};

export class PacketConnection extends EventEmitter<PacketConnectionEventMap> {
  constructor(private streamConnection: StreamConnection, options?: Partial<PacketConnectionOptions>) {
    super();

    const opts: PacketConnectionOptions = Object.assign({
      packetWindow: defaultPacketWindow,
    }, options || {});

    let ingressBuffer = Buffer.alloc(0);

    streamConnection.on('close', () => {
      this.emit('close');
      // Should be removed from references by user
      // We can not destroy ourselves
    });

    streamConnection.on('data', (chunk: string | Buffer) => {
      ingressBuffer = Buffer.concat([ ingressBuffer, Buffer.from(chunk) ]).subarray(-(opts.packetWindow));

      // Search for a complete frame
      let frameEndIndex: number;
      while ((frameEndIndex = ingressBuffer.indexOf(FRAME_END)) >= 0) {
        // We supposedly got a frame, shift it from the ingress buffer
        let frame = ingressBuffer.subarray(0, frameEndIndex);
        ingressBuffer = ingressBuffer.subarray(frameEndIndex + 1);
        // Decode escape sequences
        let frameEscapeIndex: number;
        let frameEscapePointer = 0;
        while((frameEscapeIndex = frame.indexOf(FRAME_ESC, frameEscapePointer)) >= 0) {
          // Discard frame if invalid escape sequence detected
          if (!(frame[frameEscapeIndex+1] in decodeTable)) {
            frame = Buffer.alloc(0);
            break;
          }
          // Replace the escape sequence
          const sequence = decodeTable[frame[frameEscapeIndex + 1]];
          frame = Buffer.concat([
            frame.subarray(0, frameEscapeIndex),
            sequence,
            frame.subarray(frameEscapeIndex + 2), // TODO: longer escape sequences?
          ]);
          frameEscapePointer = frameEscapeIndex + sequence.length; // Next check skip decoded byte
        }
        // Discard frame if it's too short to contain crc
        if (frame.length < 2) continue;
        // Discard upon crc failure
        if (crc16(frame)) continue;
        // Remove crc from frame
        frame = frame.subarray(0, frame.length - 2);
        // Emit the received frame
        this.emit('message', frame);
      }
    });

  }

  send(chunk: string|Buffer): void {

    // Build message + crc
    // CAUTION: message mutates
    let message = Buffer.concat([
      Buffer.from(chunk),
      Buffer.from([0x00, 0x00]),
    ]);
    let crc = crc16(message);
    message.writeUInt16BE(crc, message.length - 2);

    // Escape any special markers in the frame
    for(const [marker,sequence] of encodeTable) {
      let frameMarkerIndex: number;
      let frameMarkerPointer = 0;
      while((frameMarkerIndex = message.indexOf(marker, frameMarkerPointer)) >= 0) {
        message = Buffer.concat([
          message.subarray(0, frameMarkerIndex),
          sequence,
          message.subarray(frameMarkerIndex + 1),
        ]);
        frameMarkerPointer = frameMarkerIndex + sequence.length;
      }

    }

    // Wrap the frame in frame-end markers
    message = Buffer.concat([
      Buffer.from([FRAME_END]), // Invalidate noise on the line using crc or too-small packet
      message,             // The actual message
      Buffer.from([FRAME_END]), // And close the message
    ]);

    // And actually send the message
    this.streamConnection.write(message);
  }

  close(chunk?: string|Buffer) {
    if (chunk) this.send(chunk);
    if ('end' in this.streamConnection) {
      this.streamConnection.end();
    } else if ('close' in this.streamConnection) {
      this.streamConnection.close();
    }
  }
}

export default PacketConnection;

export function isPacketConnection(subject: unknown): subject is PacketConnection {
  return subject instanceof PacketConnection;
}
