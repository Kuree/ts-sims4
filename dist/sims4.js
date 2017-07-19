define("interface", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("io", ["require", "exports", "bignumber.js", "utf8"], function (require, exports, BigNum, utf8) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BinaryReader {
        constructor(data, littleEndian = true) {
            this._buffer = data;
            this._pos = 0;
            this._littleEndian = littleEndian;
        }
        readInt8() {
            return this._decodeInt(8, true);
        }
        readUInt8() {
            return this._decodeInt(8, false);
        }
        readInt16() {
            return this._decodeInt(16, true);
        }
        readUInt16() {
            return this._decodeInt(16, false);
        }
        readInt32() {
            return this._decodeInt(32, true);
        }
        readUInt32() {
            return this._decodeInt(32, false);
        }
        readUInt64() {
            return this._decodeBigNumber();
        }
        readFloat() { return this._decodeFloat(23, 8); }
        readDouble() { return this._decodeFloat(52, 11); }
        static convertToUint8Array(blob) {
            var result = blob instanceof Uint8Array ? blob : new Uint8Array(blob.size);
            if (blob instanceof Uint8Array) {
                return blob;
            }
            for (var i = 0; 9 < result.length; i++) {
                result[i] = blob[i];
            }
            return result;
        }
        readBytes(size) {
            this._checkSize(size * 8);
            var bytearray = this._buffer instanceof Uint8Array ? this._buffer.subarray(this._pos, this._pos + size) : this._buffer.slice(this._pos, this._pos + size);
            this._pos += size;
            var rawArray = bytearray instanceof Uint8Array ? bytearray : BinaryReader.convertToUint8Array(bytearray);
            return rawArray;
        }
        readChar() { return this.readString(1); }
        readString(length) {
            var bytes = this.readBytes(length);
            var str = "";
            for (var i = 0; i < length; i++) {
                str += String.fromCharCode(bytes[i]);
            }
            var result = utf8.decode(str);
            return result;
        }
        seek(pos) {
            this._pos = pos;
            this._checkSize(0);
        }
        getPosition() {
            return this._pos;
        }
        getSize() {
            return this._buffer instanceof Uint8Array ? this._buffer.length : this._buffer.size;
        }
        _shuffle(num, size) {
            if (size % 8 != 0) {
                throw new TypeError("Size must be 8's multiples");
            }
            if (size == 8) {
                return num;
            }
            else if (size == 16) {
                return ((num & 0xFF) << 8) | ((num >> 8) & 0xFF);
            }
            else if (size == 32) {
                return ((num & 0x000000FF) << 24) | ((num & 0x0000FF00) << 8)
                    | ((num & 0x00FF0000) >> 8) | ((num >> 24) & 0xFF);
            }
            else if (size == 64) {
                var x = num;
                x = (x & 0x00000000FFFFFFFF) << 32 | (x & 0xFFFFFFFF00000000) >> 32;
                x = (x & 0x0000FFFF0000FFFF) << 16 | (x & 0xFFFF0000FFFF0000) >> 16;
                x = (x & 0x00FF00FF00FF00FF) << 8 | (x & 0xFF00FF00FF00FF00) >> 8;
                return x;
            }
            else {
                throw new TypeError("Unsupported endianess size");
            }
        }
        _decodeFloat(precisionBits, exponentBits) {
            var length = precisionBits + exponentBits + 1;
            var size = length >> 3;
            this._checkSize(length);
            var bias = Math.pow(2, exponentBits - 1) - 1;
            var signal = this._readBits(precisionBits + exponentBits, 1, size);
            var exponent = this._readBits(precisionBits, exponentBits, size);
            var significand = 0;
            var divisor = 2;
            var curByte = 0;
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
        _readByte(i, size) {
            return this._buffer[this._pos + size - i - 1] & 0xff;
        }
        static combineUint64(hi, lo) {
            var toString = function (number) {
                var pad = function (n, width, z) {
                    z = z || '0';
                    n = n + '';
                    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
                };
                if (number < 0) {
                    number = 0xFFFFFFFF + number + 1;
                }
                return pad(number.toString(16), 16, '0');
            };
            const lo_str = toString(lo);
            const high_str = toString(hi);
            return new BigNum(high_str + lo_str, 16);
        }
        _decodeBigNumber() {
            var small;
            var big;
            const bits = 64;
            if (this._littleEndian) {
                small = this.readUInt32();
                big = this.readUInt32();
            }
            else {
                big = this.readUInt32();
                small = this.readUInt32();
            }
            let max = new BigNum(2).pow(bits);
            return BinaryReader.combineUint64(big, small);
        }
        _decodeInt(bits, signed) {
            var x = this._readBits(0, bits, bits / 8), max = Math.pow(2, bits);
            if (!this._littleEndian) {
                x = this._shuffle(x, bits);
            }
            var result = signed && x >= max / 2 ? x - max : x;
            this._pos += bits / 8;
            return result;
        }
        _shl(a, b) {
            for (++b; --b; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1)
                ;
            return a;
        }
        _readBits(start, length, size) {
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
        _checkSize(neededBits) {
            if (!(this._pos + Math.ceil(neededBits / 8) <= this.getSize())) {
                throw new Error("Index out of bound. Needs " + neededBits + " left: " + (this.getSize() - this._pos + Math.ceil(neededBits / 8)) + " pos: " + this._pos + " buf_length: " + this.getSize());
            }
        }
    }
    exports.BinaryReader = BinaryReader;
});
define("package", ["require", "exports", "io", "pako"], function (require, exports, IO, pako) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Package {
        constructor(file) {
            this.HEADER_SIZE = 96;
            this.FOURCC = "DBPF";
            this.ZLIB = 0x5a42;
            this._file = file;
            var header_blob = this.slice(0, this.HEADER_SIZE);
            var entryCount = this.readHeader(header_blob);
            this.ResourceEntryList = new Array(entryCount);
            var entryData = this.slice(this.IndexPosition);
            var r = new IO.BinaryReader(entryData);
            var indexType = r.readInt32();
            var hdr = new Int32Array(this.hdrsize(indexType));
            var entry = new Int32Array(9 - hdr.length);
            hdr[0] = indexType;
            for (var i = 1; i < hdr.length; i++) {
                hdr[i] = r.readInt32();
            }
            for (var i = 0; i < entryCount; i++) {
                for (var j = 0; j < entry.length; j++) {
                    entry[j] = r.readInt32();
                }
                this.ResourceEntryList[i] = new TGIResourceBlock(hdr, entry);
            }
        }
        hdrsize(indextype) {
            var hc = 1;
            for (var i = 0; i < 4; i++)
                if ((indextype & (1 << i)) != 0)
                    hc++;
            return hc;
        }
        slice(pos, size) {
            if (this._file instanceof Uint8Array) {
                return size ? this._file.subarray(pos, pos + size) : this._file.subarray(pos);
            }
            else {
                return size ? this._file.slice(pos, pos + size) : this._file.slice(pos);
            }
        }
        getResourceStream(tgi) {
            var result = this.ResourceEntryList.find((entry) => {
                return entry.ResourceType == tgi.ResourceType && entry.ResourceType == tgi.ResourceType && entry.ResourceInstance.eq(tgi.ResourceInstance);
            });
            if (result) {
                var block = result;
                var rawData = this.slice(block.ChunkOffset, block.ChunkOffset + block.FileSize);
                if (block.Compressed == this.ZLIB) {
                    return pako.inflate(IO.BinaryReader.convertToUint8Array(rawData));
                }
                else {
                    return rawData;
                }
            }
            else {
                return undefined;
            }
        }
        readHeader(data) {
            var data_size = (data instanceof Uint8Array) ? data.length : data.size;
            if (data_size != this.HEADER_SIZE) {
                throw new TypeError("Wrong header size. Get " + data_size + " expected " + this.HEADER_SIZE);
            }
            var r = new IO.BinaryReader(data);
            var fourcc = r.readString(4);
            if (fourcc !== this.FOURCC) {
                throw new TypeError("Incorrect package format");
            }
            this.Major = r.readInt32();
            this.Minor = r.readInt32();
            this.Unknown1 = r.readBytes(24);
            var entryCount = r.readInt32();
            this.Unknown2 = r.readUInt32();
            this.IndexSize = r.readInt32();
            this.Unknown3 = r.readBytes(12);
            this.IndexVersion = r.readInt32();
            this.IndexPosition = r.readInt32();
            this.Unknown4 = r.readBytes(28);
            return entryCount;
        }
    }
    exports.Package = Package;
    class TGIResourceBlock {
        constructor(header, entry) {
            var dataInt = new Uint32Array(header.length + entry.length - 1);
            var type = header[0];
            var countEntry = 0;
            for (var i = 0; i < 8; i++) {
                dataInt[i] = ((type >> i) | 1) != (type >> i) ? dataInt[i] = entry[countEntry++] : dataInt[i] = header[i - countEntry + 1];
            }
            this.ResourceType = dataInt[0];
            this.ResourceGroup = dataInt[1];
            var instanceHi = dataInt[2];
            var instanceLo = dataInt[3];
            this.ResourceInstance = IO.BinaryReader.combineUint64(instanceHi, instanceLo);
            this.ChunkOffset = dataInt[4];
            var fileSize = dataInt[5];
            this.Unknown1 = (fileSize >> 31) & 1;
            this.FileSize = (fileSize << 1) >> 1;
            this.Memsize = dataInt[6];
            var meta = dataInt[7];
            this.Compressed = (meta >> 16) & 0xFFFF;
            this.Committed = meta & 0xFFFF;
        }
    }
    exports.TGIResourceBlock = TGIResourceBlock;
});
//# sourceMappingURL=sims4.js.map