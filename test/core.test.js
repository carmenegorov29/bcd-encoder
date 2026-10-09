import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  encodeUnpacked,
  decodeUnpacked,
  encodePacked,
  decodePacked,
} from '../src/index.js';

test('encodeUnpacked: zero', () => {
  assert.deepEqual(Array.from(encodeUnpacked(0)), [0x00]);
});

test('encodeUnpacked: single digit', () => {
  assert.deepEqual(Array.from(encodeUnpacked(7)), [0x07]);
});

test('encodeUnpacked: multi-digit value, big-endian digit order', () => {
  // 1234 -> digits 1,2,3,4 each in its own byte.
  assert.deepEqual(Array.from(encodeUnpacked(1234)), [0x01, 0x02, 0x03, 0x04]);
});

test('encodeUnpacked: rejects negative and non-integer', () => {
  assert.throws(() => encodeUnpacked(-1), RangeError);
  assert.throws(() => encodeUnpacked(1.5), RangeError);
  assert.throws(() => encodeUnpacked(NaN), TypeError);
});

test('decodeUnpacked: round-trips a value', () => {
  const bytes = encodeUnpacked(90210);
  assert.equal(decodeUnpacked(bytes), 90210);
});

test('decodeUnpacked: ignores high nibble junk', () => {
  // Hardware RTC registers sometimes leave bits in the high nibble; we mask
  // them off rather than rejecting the whole byte.
  assert.equal(decodeUnpacked([0xf1, 0xf2, 0xf3]), 123);
});

test('decodeUnpacked: rejects a low nibble of 0xA..0xF', () => {
  // Even after masking, 0xFA yields nibble 0xA which is not a decimal digit.
  assert.throws(() => decodeUnpacked([0xfa]), RangeError);
});

test('decodeUnpacked: rejects non-integer byte', () => {
  assert.throws(() => decodeUnpacked([1.5]), TypeError);
});

test('encodePacked: zero', () => {
  assert.deepEqual(Array.from(encodePacked(0)), [0x00]);
});

test('encodePacked: odd digit count gets a leading zero', () => {
  // 123 has three digits; packed needs an even count, so a leading 0 is
  // implied, producing 0x01 then 0x23.
  assert.deepEqual(Array.from(encodePacked(123)), [0x01, 0x23]);
});

test('encodePacked: even digit count packs cleanly', () => {
  assert.deepEqual(Array.from(encodePacked(1234)), [0x12, 0x34]);
});

test('encodePacked: rejects negative', () => {
  assert.throws(() => encodePacked(-1), RangeError);
});

test('decodePacked: round-trips values with odd and even digit counts', () => {
  for (const v of [0, 7, 12, 123, 1234, 999999]) {
    assert.equal(decodePacked(encodePacked(v)), v, `round-trip ${v}`);
  }
});

test('decodePacked: rejects an invalid nibble', () => {
  // 0xAB: both nibbles out of decimal range.
  assert.throws(() => decodePacked([0xab]), RangeError);
});

test('decodePacked: rejects a byte with one bad nibble', () => {
  // 0x1F: high nibble fine, low nibble invalid.
  assert.throws(() => decodePacked([0x1f]), RangeError);
});
