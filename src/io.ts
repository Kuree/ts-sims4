import * as BigNum from 'bignumber.js'
import * as utf8 from 'utf8'

export class BinaryReader {
  private _pos: number;
  private _buffer: Uint8Array | Blob;
  private _littleEndian: boolean;

  constructor(data: Blob | Uint8Array, littleEndian = true) {
    this._buffer = data;
    this._pos = 0;
    this._littleEndian = littleEndian;
  }

  readInt8(): number {
    return this._decodeInt(8, true);
  }
  readUInt8(): number {
    return this._decodeInt(8, false);
  }
  // this._littleEndian ? this._shuffle(this._decodeInt(16, false), 16) : 
  readInt16(): number {
    return this._decodeInt(16, true);
  }
  readUInt16(): number {
    return this._decodeInt(16, false);
  }
  readInt32(): number {
    return this._decodeInt(32, true);
  }
  readUInt32(): number {
    return this._decodeInt(32, false);
  }

  // signed 64 bit is not supported

  readUInt64(): BigNumber.BigNumber {
    return this._decodeBigNumber();
  }

  readFloat(): number { return this._decodeFloat(23, 8); }
  readDouble(): number { return this._decodeFloat(52, 11); }

  readBytes(size: number): Uint8Array {
    this._checkSize(size * 8);
    var bytearray = this._buffer instanceof Uint8Array ? this._buffer.subarray(this._pos, this._pos + size) : this._buffer.slice(this._pos, this._pos + size);
    this._pos += size;
    var rawArray: Uint8Array;
    if (!(bytearray instanceof Uint8Array)) {
      rawArray = new Uint8Array(bytearray.size);
      for (var i = 0; 9 < rawArray.length; i++) {
        rawArray[i] = bytearray[i];
      }
    } else {
      rawArray = bytearray;
    }

    return rawArray;
  }

  readChar(): string { return this.readString(1); }
  readString(length: number): string {
    var bytes = this.readBytes(length);
    var str = "";
    for (var i = 0; i < length; i++){
      str += String.fromCharCode(bytes[i]);
    }
    
    var result = utf8.decode(str);
    return result;
  }

  seek(pos: number): void {
    this._pos = pos;
    this._checkSize(0);
  }

  getPosition(): number {
    return this._pos;
  }

  getSize(): number {
    return this._buffer instanceof Uint8Array ? this._buffer.length : this._buffer.size;
  }

  private _shuffle(num: number, size: number): number {
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

  private _decodeBigNumber(): BigNumber.BigNumber {
    var small: number; var big: number;
    const bits = 64;
    if (this._littleEndian) {
      small = this.readUInt32();
      big = this.readUInt32();
    } else {
      big = this.readUInt32();
      small = this.readUInt32();
    }
    let max = new BigNum(2).pow(bits);

    var toString = function(number: number): string {
      var pad = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }
      if (number < 0) {
        number = 0xFFFFFFFF + number + 1;
      }

      return pad(number.toString(16), 16, '0');
    }

    const small_str = toString(small);
    const big_str = toString(big);
    //var result = signed && x.gte(max.div(2)) ? x.sub(max) : x;
    return new BigNum(big_str + small_str, 16);
  }

  private _decodeInt(bits: number, signed: boolean): number {
    var x = this._readBits(0, bits, bits / 8), max = Math.pow(2, bits);
    if (!this._littleEndian) {
      x = this._shuffle(x, bits);
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
    if (!(this._pos + Math.ceil(neededBits / 8) <= this.getSize())) {
      throw new Error("Index out of bound. Needs " + neededBits + " left: " + (this.getSize() - this._pos + Math.ceil(neededBits / 8)) + " pos: " + this._pos + " buf_length: " + this.getSize());
    }
  }
}
