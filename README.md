# BCD Encoder

Convert between unsigned integers and packed / unpacked binary-coded-decimal byte representations in pure ESM JavaScript. No dependencies.

```js
import { encodeUnpacked, decodeUnpacked, encodePacked, decodePacked } from 'bcd-encoder';

encodeUnpacked(123);    // Uint8Array [0x01, 0x02, 0x03]
decodeUnpacked([0x01, 0x02, 0x03]); // 123

encodePacked(123);      // Uint8Array [0x01, 0x23]
decodePacked([0x01, 0x23]); // 123
```

## Why this exists

Some hardware peripherals — RTC chips, smart-card readers, legacy point-of-sale
protocols — exchange numbers as BCD rather than plain binary. When you are
talking to such a device from JavaScript you need a conversion layer that is
small, explicit, and does not drag in a general-purpose big-integer library.
That is all this is.

The trade-off: the library only handles unsigned integers. Signed BCD has at
least three incompatible sign-nibble conventions (leading 0xD, trailing 0xD,
separate sign byte) and picking one silently would surprise callers who
expected another. If you need signed BCD, copy the four functions here and
add the convention your device actually uses.

## Edge cases worth knowing

- `encodePacked` pads an odd number of decimal digits with a leading zero so
  every byte carries two digits. `encodePacked(123)` is `[0x01, 0x23]`, not
  `[0x23]`. Decoding either form gives back the original number.
- `decodeUnpacked` masks off the high nibble of each byte before checking
  range, so a byte like `0xF3` is accepted as digit `3`. This matches what
  you see reading raw RTC registers where unused bits are not guaranteed
  zero. `decodePacked` does **not** do this — a stray nibble there is treated
  as corruption and rejected.
- Inputs are validated: negative numbers, non-integers, and `NaN` throw.
  `decodeUnpacked` and `decodePacked` require integer bytes and reject
  nibbles outside `0..9` (after masking, for the unpacked case).

## Exports

| Name             | Signature                                        |
| ---------------- | ------------------------------------------------ |
| `encodeUnpacked` | `(value: number) => Uint8Array`                  |
| `decodeUnpacked` | `(bytes: Uint8Array \| number[]) => number`      |
| `encodePacked`   | `(value: number) => Uint8Array`                  |
| `decodePacked`   | `(bytes: Uint8Array \| number[]) => number`      |

Run the tests with `node --test`.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

