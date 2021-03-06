import * as utf8 from 'utf8'

export class Uint64 {
  hi: number;
  lo: number;
  constructor(hi: number, lo: number) {
    this.hi = hi;
    this.lo = lo;
  }

  eq(num: Uint64) {
    return this.hi === num.hi && this.lo === num.lo;
  }

  toString() {
    if (this.hi === 0) {
      return this.lo.toString(16);
    }
    var loString = padString(this.lo.toString(16), 8, '0');
    var hiString = this.hi.toString(16);
    return hiString + loString;
  }
}

function _shuffle(num: number, size: number): number {
  if (size % 8 != 0) {
    throw new TypeError("Size must be 8's multiples");
  }
  if (size == 8) {
    return num;
  } else if (size == 16) {
    return ((num & 0xFF) << 8) | ((num >> 8) & 0xFF);
  } else if (size == 32) {
    return ((num & 0x000000FF) << 24) | ((num & 0x0000FF00) << 8)
      | ((num & 0x00FF0000) >> 8) | ((num >> 24) & 0xFF);
  } else if (size == 64) {
    var x = num;
    x = (x & 0x00000000FFFFFFFF) << 32 | (x & 0xFFFFFFFF00000000) >> 32;
    x = (x & 0x0000FFFF0000FFFF) << 16 | (x & 0xFFFF0000FFFF0000) >> 16;
    x = (x & 0x00FF00FF00FF00FF) << 8 | (x & 0xFF00FF00FF00FF00) >> 8;
    return x;
  } else {
    throw new TypeError("Unsupported endianess size");
  }
}

// a huge improvement from
// http://blog.vjeux.com/wp-content/uploads/2010/01/binaryReader.js
export class BinaryReader {
  private _pos: number;
  private _buffer: Uint8Array | Blob;
  littleEndian: boolean;

  constructor(data: Blob | Uint8Array, littleEndian = true) {
    this._buffer = data;
    this._pos = 0;
    this.littleEndian = littleEndian;
  }

  readInt8(): number { return this._decodeInt(8, true); }
  readUInt8(): number { return this._decodeInt(8, false); }
  // this._littleEndian ? this._shuffle(this._decodeInt(16, false), 16) : 
  readInt16(): number { return this._decodeInt(16, true); }
  readUInt16(): number { return this._decodeInt(16, false); }
  readInt32(): number { return this._decodeInt(32, true); }
  readUInt32(): number { return this._decodeInt(32, false); }

  // signed 64 bit is not supported

  readUInt64(): Uint64 {
    return this._decodeBigNumber();
  }

  readFloat(): number { return this._decodeFloat(23, 8); }
  readDouble(): number { return this._decodeFloat(52, 11); }

  readBytes(size: number): Uint8Array {
    if (size === 0) {
      return new Uint8Array(0);
    }
    this._checkSize(size * 8);
    var bytearray = this._buffer instanceof Uint8Array ? this._buffer.subarray(this._pos, this._pos + size) : this._buffer.slice(this._pos, this._pos + size);
    this._pos += size;
    var rawArray = bytearray instanceof Uint8Array ? bytearray : convertToUint8Array(bytearray);

    return rawArray;
  }

  readChar(): string { return this.readString(1); }
  readString(length: number): string {
    var bytes = this.readBytes(length);
    var str = "";
    for (var i = 0; i < length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    var result = utf8.decode(str);
    return result;
  }

  read7BitLength(): number{
    var length = 0;
    var i = 0;
    while (true) {
      var byte = this.readUInt8();
      var num = byte & 0x7F;
      if (byte & 0x80) {
        length += num << i;
        i += 7;
      } else {
        length += num << i;
        break;
      }
    }
    return length;
  }

  read7bitString(): string {
    // whoever decided to use 7 bit encoding to encode string length is stupid.
    // whoever makes their program generates such long string is even worse.
    var length = this.read7BitLength();
    var bytes = this.readBytes(length);
    var str = "";
    for (var i = 0; i < bytes.length;) {
      str += String.fromCharCode(bytes[i++] * 256 + bytes[i++]);
    }
    return str;
  }

  seek(pos: number): void {
    this._pos = pos;
    this._checkSize(0);
  }

  position(): number {
    return this._pos;
  }

  size(): number {
    return this._buffer instanceof Uint8Array ? this._buffer.length : this._buffer.size;
  }

  private _decodeFloat(precisionBits: number, exponentBits: number): number {
    var length = precisionBits + exponentBits + 1;
    var size = length >> 3;
    this._checkSize(length);

    var bias = Math.pow(2, exponentBits - 1) - 1;
    var signal = this._readBits(precisionBits + exponentBits, 1, size);
    var exponent = this._readBits(precisionBits, exponentBits, size);
    var significand = 0;
    var divisor = 2;
    var curByte = 0; //length + (-precisionBits >> 3) - 1;
    do {
      var byteValue = this._readByte(++curByte, size);
      var startBit = precisionBits % 8 || 8;
      var mask = 1 << startBit;
      while (mask >>= 1) {
        if (byteValue & mask) {
          significand += 1 / divisor;
        }
        divisor *= 2;
      }
    } while (precisionBits -= startBit);

    this._pos += size;

    return exponent == (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity
      : (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand
        : Math.pow(2, exponent - bias) * (1 + significand) : 0);
  }

  private _readByte(i: number, size: number): number {
    return this._buffer[this._pos + size - i - 1] & 0xff;
  }

  private _decodeBigNumber(): Uint64 {
    var small: number; var big: number;
    const bits = 64;
    if (this.littleEndian) {
      small = this.readUInt32();
      big = this.readUInt32();
    } else {
      big = this.readUInt32();
      small = this.readUInt32();
    }
    //let max = new BigNum(2).pow(bits);

    return new Uint64(big, small);
    //var result = signed && x.gte(max.div(2)) ? x.sub(max) : x;
  }

  private _decodeInt(bits: number, signed: boolean): number {
    var x = this._readBits(0, bits, bits / 8), max = Math.pow(2, bits);
    if (!this.littleEndian) {
      x = _shuffle(x, bits);
    }
    var result = signed && x >= max / 2 ? x - max : x;

    this._pos += bits / 8;
    return result;
  }

  //shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
  private _shl(a: number, b: number): number {
    for (++b; --b; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
    return a;
  }

  private _readBits(start: number, length: number, size: number): number {
    var offsetLeft = (start + length) % 8;
    var offsetRight = start % 8;
    var curByte = size - (start >> 3) - 1;
    var lastByte = size + (-(start + length) >> 3);
    var diff = curByte - lastByte;

    var sum = (this._readByte(curByte, size) >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1);

    if (diff && offsetLeft) {
      sum += (this._readByte(lastByte++, size) & ((1 << offsetLeft) - 1)) << (diff-- << 3) - offsetRight;
    }

    while (diff) {
      sum += this._shl(this._readByte(lastByte++, size), (diff-- << 3) - offsetRight);
    }

    return sum;
  }

  private _checkSize(neededBits: number): void {
    if (!(this._pos + Math.ceil(neededBits / 8) <= this.size())) {
      throw new Error("Index out of bound. Needs " + neededBits + " left: " + (this.size() - this._pos + Math.ceil(neededBits / 8)) + " pos: " + this._pos + " buf_length: " + this.size());
    }
  }
}

export function convertToUint8Array(blob: Blob | Uint8Array) {
  var result = blob instanceof Uint8Array ? blob : new Uint8Array(blob.size);
  if (blob instanceof Uint8Array) {
    return blob; // return directly
  }
  for (var i = 0; i < result.length; i++) {
    result[i] = blob[i];
  }
  return result;
}

export function padString(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export class BinaryWriter {
  private _buffer: Uint8Array;
  private _pos: number;
  private _length: number;
  littleEndian: boolean;

  constructor(size = 65536, littleEndian = true) {
    this._buffer = new Uint8Array(size);
    this._pos = 0;
    this._length = 0;
    this.littleEndian = littleEndian;
  }

  length() {
    return this._length;
  }

  seek(pos: number) {
    if (pos >= this._length) {
      throw new RangeError("Buffer outside of range");
    }
    this._pos = pos;
  }

  position() {
    return this._pos;
  }

  getBuffer() {
    return this._buffer.slice(0, this._length);
  }

  writeInt8(num: number) { this._encodeInt(num, 8, true); }
  writeUInt8(num: number) { this._encodeInt(num, 8, false); }
  writeInt16(num: number) { this._encodeInt(num, 16, true); }
  writeUInt16(num: number) { this._encodeInt(num, 16, false); }
  writeInt32(num: number) { this._encodeInt(num, 32, true); }
  writeUInt32(num: number) { this._encodeInt(num, 32, false); }

  writeUInt64(num: Uint64) {
    var hi = num.hi;
    var lo = num.lo;

    // position will be handled by encodeInt
    if (this.littleEndian) {
      this._encodeInt(lo, 32, false);
      this._encodeInt(hi, 32, false);
    } else {
      this._encodeInt(hi, 32, false);
      this._encodeInt(lo, 32, false);
    }
  }

  writeBytes(bytes: Uint8Array) {
    this._checkSize(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      this._buffer[this._pos + i] = bytes[i];
    }

    this._pos += bytes.length;
    this._length = Math.max(this._length, this._pos);
  }

  writeByte(byte: number) {
    var data = byte & 0xFF;
    var array = new Uint8Array(1);
    array[0] = data;
    this.writeBytes(array);
  }

  writeString(str: string) {
    var byteString = utf8.encode(str);
    var bytes = new Uint8Array(byteString.length);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }

    this.writeBytes(bytes);
  }

  private _encodeInt(num: number, size: number, signed: boolean) {
    if (size % 8 !== 0) {
      throw new TypeError("Invalid number size");
    }
    if (!this.littleEndian) { num = _shuffle(num, size); }
    if (signed && num < 0) {
      var max = 0xFFFFFFFF >> (32 - size);
      num = max + num + 1;
    }
    var numBytes = Math.floor(size / 8);
    var array = new Uint8Array(numBytes);
    for (var i = 0; i < numBytes; i++) {
      var shiftAmount = 8 * i;
      var byte = (num >> shiftAmount) & 0xFF;
      array[i] = byte;
    }
    this.writeBytes(array);
  }

  private _checkSize(size: number) {
    if (size + this._pos >= this._buffer.length) {
      this._expand();
    }
  }
  private _expand() {
    // double the size
    var empty = new Uint8Array(this._buffer.length);
    this._buffer = this._arrayCopy(this._buffer, empty);
  }


  private _arrayCopy(src1: Uint8Array, src2: Uint8Array, dest?: Uint8Array) {
    if (!dest) {
      dest = new Uint8Array(src1.length + src2.length);
    }
    for (var i = 0; i < src1.length; i++) {
      dest[i] = src1[i];
    }
    for (var i = 0; i < src2.length; i++) {
      dest[i + src1.length] = src2[i];
    }
    return dest;
  }
}

export class BitConverter{
  private static _readNumber(data: Uint8Array | Blob, offset: number, size: number, signed: boolean) {
    var br = new BinaryReader(data);
    br.seek(offset);
    if (size == 8) {
      return signed? br.readInt8() : br.readUInt8();
    } else if (size == 16) {
      return signed? br.readInt16() : br.readUInt16();
    } else if (size == 32) {
      return signed? br.readInt32() : br.readUInt32();
    } else {
      throw new Error("Not implemented");
    }
  }

  static toUInt16(data: Uint8Array | Blob, offset: number) {
    return BitConverter._readNumber(data, offset, 16, false);
  }
  static toInt16(data: Uint8Array | Blob, offset: number) {
    return BitConverter._readNumber(data, offset, 16, true);
  }
  static toUInt32(data: Uint8Array | Blob, offset: number) {
    return BitConverter._readNumber(data, offset, 32, false);
  }
  static toInt32(data: Uint8Array | Blob, offset: number) {
    return BitConverter._readNumber(data, offset, 32, true);
  }
}
