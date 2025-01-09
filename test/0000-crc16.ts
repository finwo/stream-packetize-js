import { crc16, crc16b } from '../src/crc16-xmodem';
import test from 'tape';

const knownValues: [string,number][] = [
  ["Hello World\0\0"  , 0x992A],
  ["Hello World!\0\0" , 0x0CD3],
  ["Pizza Calzone\0\0", 0x795B],
];

test('Testing CRC-16/XMODEM', t => {
  const message = Buffer.from('Hi!\0\0');

  // The buffer-variant re-uses this method
  const val_0 = crc16(message);
  t.equal(val_0, 12797 , "'Hi!' produces good known-value numerically");

  // Validate the number is converted to a buffer correctly
  const val_1 = crc16b(message);
  t.equal(val_1.toString('hex'), "31fd", "'Hi!' produces good known-value as buffer");

  // Validate all known values in the table
  for(const check of knownValues) {
    t.equal(crc16(Buffer.from(check[0], 'ascii')), check[1], `known value '${check[0].slice(0,check[0].length-2)}' produces correct output`);
  }

  // Check inverse
  for(const check of knownValues) {
    const nb = Buffer.from(check[0], 'ascii');
    nb.writeUInt16BE(crc16(nb), nb.length - 2);
    t.equal(crc16(nb), 0, `inverse '${check[0].slice(0,check[0].length-2)}' resolves to 0 when no errors introduced`);
    nb[0]++;
    t.notEqual(crc16(nb), 0, `inverse '${check[0].slice(0,check[0].length-2)}' resolves to non-0 with increment error`);
    nb[0]--;
    nb[1] ^= 0x02;
    t.notEqual(crc16(nb), 0, `inverse '${check[0].slice(0,check[0].length-2)}' resolves to non-0 with 1 bit-flip`);
    nb[1] ^= 0x04;
    t.notEqual(crc16(nb), 0, `inverse '${check[0].slice(0,check[0].length-2)}' resolves to non-0 with 2 consecutive bit-flips`);
  }

  t.end();
});
