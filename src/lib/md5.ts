/**
 * Minimal MD5 implementation – adapted from the open‑source `spark-md5` library.
 * This version works in the browser without any external dependencies.
 * It provides a `hash` function that accepts a string (binary content) and
 * returns the 32‑character hexadecimal MD5 digest.
 */

// Constants table.
const T = new Uint32Array([
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

function toHex(num: number): string {
  const hex = (num >>> 0).toString(16);
  return "0".repeat(8 - hex.length) + hex;
}

export function md5(input: string): string {
  // Convert string to UTF‑8 bytes.
  const msg = new TextEncoder().encode(input);
  const msgLen = msg.length;
  const withOne = new Uint8Array(msgLen + 1);
  withOne.set(msg);
  withOne[msgLen] = 0x80; // append "1" bit

  const totalLen = ((msgLen + 9 + 63) >> 6) << 4; // number of 32‑bit words
  const buffer = new Uint32Array(totalLen);
  const view = new DataView(buffer.buffer);

  // copy bytes
  for (let i = 0; i < withOne.length; i++) {
    buffer[i >> 2] |= withOne[i] << ((i % 4) * 8);
  }
  // append length in bits (little‑endian)
  const bits = msgLen * 8;
  buffer[totalLen - 2] = bits & 0xffffffff;
  buffer[totalLen - 1] = (bits / 0x100000000) >>> 0;

  // Initialize MD5 state.
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < buffer.length; i += 16) {
    const originalA = a;
    const originalB = b;
    const originalC = c;
    const originalD = d;
    // Round 1
    a = ff(a, b, c, d, buffer[i + 0], 7, T[0]);
    d = ff(d, a, b, c, buffer[i + 1], 12, T[1]);
    c = ff(c, d, a, b, buffer[i + 2], 17, T[2]);
    b = ff(b, c, d, a, buffer[i + 3], 22, T[3]);
    a = ff(a, b, c, d, buffer[i + 4], 7, T[4]);
    d = ff(d, a, b, c, buffer[i + 5], 12, T[5]);
    c = ff(c, d, a, b, buffer[i + 6], 17, T[6]);
    b = ff(b, c, d, a, buffer[i + 7], 22, T[7]);
    a = ff(a, b, c, d, buffer[i + 8], 7, T[8]);
    d = ff(d, a, b, c, buffer[i + 9], 12, T[9]);
    c = ff(c, d, a, b, buffer[i + 10], 17, T[10]);
    b = ff(b, c, d, a, buffer[i + 11], 22, T[11]);
    a = ff(a, b, c, d, buffer[i + 12], 7, T[12]);
    d = ff(d, a, b, c, buffer[i + 13], 12, T[13]);
    c = ff(c, d, a, b, buffer[i + 14], 17, T[14]);
    b = ff(b, c, d, a, buffer[i + 15], 22, T[15]);
    // Round 2
    a = gg(a, b, c, d, buffer[i + 1], 5, T[16]);
    d = gg(d, a, b, c, buffer[i + 6], 9, T[17]);
    c = gg(c, d, a, b, buffer[i + 11], 14, T[18]);
    b = gg(b, c, d, a, buffer[i + 0], 20, T[19]);
    a = gg(a, b, c, d, buffer[i + 5], 5, T[20]);
    d = gg(d, a, b, c, buffer[i + 10], 9, T[21]);
    c = gg(c, d, a, b, buffer[i + 15], 14, T[22]);
    b = gg(b, c, d, a, buffer[i + 4], 20, T[23]);
    a = gg(a, b, c, d, buffer[i + 9], 5, T[24]);
    d = gg(d, a, b, c, buffer[i + 14], 9, T[25]);
    c = gg(c, d, a, b, buffer[i + 3], 14, T[26]);
    b = gg(b, c, d, a, buffer[i + 8], 20, T[27]);
    a = gg(a, b, c, d, buffer[i + 13], 5, T[28]);
    d = gg(d, a, b, c, buffer[i + 2], 9, T[29]);
    c = gg(c, d, a, b, buffer[i + 7], 14, T[30]);
    b = gg(b, c, d, a, buffer[i + 12], 20, T[31]);
    // Round 3
    a = hh(a, b, c, d, buffer[i + 5], 4, T[32]);
    d = hh(d, a, b, c, buffer[i + 8], 11, T[33]);
    c = hh(c, d, a, b, buffer[i + 11], 16, T[34]);
    b = hh(b, c, d, a, buffer[i + 14], 23, T[35]);
    a = hh(a, b, c, d, buffer[i + 1], 4, T[36]);
    d = hh(d, a, b, c, buffer[i + 4], 11, T[37]);
    c = hh(c, d, a, b, buffer[i + 7], 16, T[38]);
    b = hh(b, c, d, a, buffer[i + 10], 23, T[39]);
    a = hh(a, b, c, d, buffer[i + 13], 4, T[40]);
    d = hh(d, a, b, c, buffer[i + 0], 11, T[41]);
    c = hh(c, d, a, b, buffer[i + 3], 16, T[42]);
    b = hh(b, c, d, a, buffer[i + 6], 23, T[43]);
    a = hh(a, b, c, d, buffer[i + 9], 4, T[44]);
    d = hh(d, a, b, c, buffer[i + 12], 11, T[45]);
    c = hh(c, d, a, b, buffer[i + 15], 16, T[46]);
    b = hh(b, c, d, a, buffer[i + 2], 23, T[47]);
    // Round 4
    a = ii(a, b, c, d, buffer[i + 0], 6, T[48]);
    d = ii(d, a, b, c, buffer[i + 7], 10, T[49]);
    c = ii(c, d, a, b, buffer[i + 14], 15, T[50]);
    b = ii(b, c, d, a, buffer[i + 5], 21, T[51]);
    a = ii(a, b, c, d, buffer[i + 12], 6, T[52]);
    d = ii(d, a, b, c, buffer[i + 3], 10, T[53]);
    c = ii(c, d, a, b, buffer[i + 10], 15, T[54]);
    b = ii(b, c, d, a, buffer[i + 1], 21, T[55]);
    a = ii(a, b, c, d, buffer[i + 8], 6, T[56]);
    d = ii(d, a, b, c, buffer[i + 15], 10, T[57]);
    c = ii(c, d, a, b, buffer[i + 6], 15, T[58]);
    b = ii(b, c, d, a, buffer[i + 13], 21, T[59]);
    a = ii(a, b, c, d, buffer[i + 4], 6, T[60]);
    d = ii(d, a, b, c, buffer[i + 11], 10, T[61]);
    c = ii(c, d, a, b, buffer[i + 2], 15, T[62]);
    b = ii(b, c, d, a, buffer[i + 9], 21, T[63]);
    a = (a + originalA) >>> 0;
    b = (b + originalB) >>> 0;
    c = (c + originalC) >>> 0;
    d = (d + originalD) >>> 0;
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return rotl((a + ((b & c) | (~b & d)) + x + t) >>> 0, s) + b >>> 0;
}
function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return rotl((a + ((b & d) | (c & ~d)) + x + t) >>> 0, s) + b >>> 0;
}
function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return rotl((a + (b ^ c ^ d) + x + t) >>> 0, s) + b >>> 0;
}
function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return rotl((a + (c ^ (b | ~d)) + x + t) >>> 0, s) + b >>> 0;
}
