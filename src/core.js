/*
 * Core conversion routines between non-negative integers and BCD byte arrays.
 *
 * Design decisions (stated plainly so callers know exactly what they get):
 *
 * - Unpacked BCD: one decimal digit per byte, stored in the low nibble.
 *   The high nibble is always zero. This matches the classic hardware
 *   "unpacked" layout used by devices such as the RTC on the original PC/AT.
 *
 * - Packed BCD: two decimal digits per byte. The high nibble of the first
 *   byte holds the most-significant digit, so the natural left-to-right byte
 *   order is big-endian over the digit string. No sign nibble is emitted;
 *   this library only handles unsigned values.
 *
 * - Leading zero digits are encoded faithfully. encodePacked(7) yields the
 *   single byte [0x07]; encodePacked(123) yields [0x12, 0x34] (because 123
 *   has an odd number of digits, a leading 0 is implied to make a whole
 *   number of nibbles). Decoding never validates that high nibbles are within
 *   0..9 in the unpacked case — it masks them off — but packed decoding does
 *   reject nibbles outside 0..9 because an out-of-range nibble there cannot
 *   correspond to any decimal digit.
 */

/**
 * Encode a non-negative integer into unpacked BCD: one byte per decimal
 * digit, the digit in the low nibble, high nibble zero.
 *
 * @param {number} value - Non-negative integer to encode.
 * @returns {Uint8Array} Bytes in big-endian (most-significant digit first) order.
 * @throws {RangeError} If value is negative or not an integer.
 * @throws {TypeError} If value is not a finite number.
 */
export function encodeUnpacked(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('value must be a finite number');
  }
  if (!Number.isInteger(value)) {
    throw new RangeError('value must be an integer');
  }
  if (value < 0) {
    throw new RangeError('value must be non-negative');
  }
  if (value === 0) {
    return new Uint8Array([0x00]);
  }
  const digits = [];
  let n = value;
  while (n > 0) {
    digits.push(n % 10);
    n = Math.floor(n / 10);
  }
  const out = new Uint8Array(digits.length);
  for (let i = 0; i < digits.length; i++) {
    // digits was filled least-significant first; emit most-significant first.
    out[i] = digits[digits.length - 1 - i] & 0x0f;
  }
  return out;
}

/**
 * Decode an unpacked BCD byte array into an integer. Only the low nibble of
 * each byte is considered, so bytes carrying junk in the high nibble (a
 * common artifact of reading raw hardware registers) still decode correctly.
 *
 * @param {Uint8Array|number[]} bytes - Unpacked BCD bytes, most-significant
 *   digit first.
 * @returns {number} The decoded non-negative integer.
 * @throws {TypeError} If bytes is not array-like of integers.
 */
export function decodeUnpacked(bytes) {
  if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError('bytes must be an array or Uint8Array');
  }
  let result = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (typeof b !== 'number' || !Number.isInteger(b)) {
      throw new TypeError('each byte must be an integer');
    }
    const digit = b & 0x0f;
    if (digit > 9) {
      // Even after masking, a nibble can be 0xA..0xF, which is not a decimal
      // digit. Reject rather than silently producing a wrong value.
      throw new RangeError(`invalid unpacked BCD nibble 0x${digit.toString(16)} at index ${i}`);
    }
    result = result * 10 + digit;
  }
  return result;
}

/**
 * Encode a non-negative integer into packed BCD: two digits per byte, high
 * nibble first. If the decimal representation has an odd number of digits,
 * a leading zero is prepended so every byte carries two digits.
 *
 * @param {number} value - Non-negative integer to encode.
 * @returns {Uint8Array} Packed BCD bytes, most-significant digit first.
 * @throws {RangeError} If value is negative or not an integer.
 * @throws {TypeError} If value is not a finite number.
 */
export function encodePacked(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('value must be a finite number');
  }
  if (!Number.isInteger(value)) {
    throw new RangeError('value must be an integer');
  }
  if (value < 0) {
    throw new RangeError('value must be non-negative');
  }
  if (value === 0) {
    return new Uint8Array([0x00]);
  }
  const digits = [];
  let n = value;
  while (n > 0) {
    digits.push(n % 10);
    n = Math.floor(n / 10);
  }
  // Pad to an even count so every byte holds two digits.
  if (digits.length % 2 !== 0) {
    digits.push(0);
  }
  const out = new Uint8Array(digits.length / 2);
  for (let i = 0; i < out.length; i++) {
    // digits is least-significant first, so byte 0 of out is the most
    // significant pair. Index from the high end.
    const hi = digits[digits.length - 1 - i * 2];
    const lo = digits[digits.length - 2 - i * 2];
    out[i] = ((hi & 0x0f) << 4) | (lo & 0x0f);
  }
  return out;
}

/**
 * Decode a packed BCD byte array into an integer. Every nibble of every byte
 * must be in 0..9; a stray hex digit is treated as corruption.
 *
 * @param {Uint8Array|number[]} bytes - Packed BCD bytes, most-significant
 *   digit first.
 * @returns {number} The decoded non-negative integer.
 * @throws {TypeError} If bytes is not an array of integers.
 * @throws {RangeError} If any nibble is outside 0..9.
 */
export function decodePacked(bytes) {
  if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError('bytes must be an array or Uint8Array');
  }
  let result = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (typeof b !== 'number' || !Number.isInteger(b)) {
      throw new TypeError('each byte must be an integer');
    }
    const hi = (b >>> 4) & 0x0f;
    const lo = b & 0x0f;
    if (hi > 9 || lo > 9) {
      throw new RangeError(`invalid packed BCD byte 0x${b.toString(16).padStart(2, '0')} at index ${i}`);
    }
    result = result * 10 + hi;
    result = result * 10 + lo;
  }
  return result;
}
