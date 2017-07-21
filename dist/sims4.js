define("io", ["require", "exports", "bignumber.js", "utf8"], function (require, exports, BigNum, utf8) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BinaryReader {
        constructor(data, littleEndian = true) {
            this._buffer = data;
            this._pos = 0;
            this.littleEndian = littleEndian;
        }
        readInt8() { return this._decodeInt(8, true); }
        readUInt8() { return this._decodeInt(8, false); }
        readInt16() { return this._decodeInt(16, true); }
        readUInt16() { return this._decodeInt(16, false); }
        readInt32() { return this._decodeInt(32, true); }
        readUInt32() { return this._decodeInt(32, false); }
        readUInt64() {
            return this._decodeBigNumber();
        }
        readFloat() { return this._decodeFloat(23, 8); }
        readDouble() { return this._decodeFloat(52, 11); }
        readBytes(size) {
            if (size === 0) {
                return new Uint8Array(0);
            }
            this._checkSize(size * 8);
            var bytearray = this._buffer instanceof Uint8Array ? this._buffer.subarray(this._pos, this._pos + size) : this._buffer.slice(this._pos, this._pos + size);
            this._pos += size;
            var rawArray = bytearray instanceof Uint8Array ? bytearray : convertToUint8Array(bytearray);
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
        position() {
            return this._pos;
        }
        size() {
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
                if (number < 0) {
                    number = 0xFFFFFFFF + number + 1;
                }
                return padString(number.toString(16), 8, '0');
            };
            const lo_str = toString(lo);
            const high_str = toString(hi);
            return new BigNum(high_str + lo_str, 16);
        }
        _decodeBigNumber() {
            var small;
            var big;
            const bits = 64;
            if (this.littleEndian) {
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
            if (!this.littleEndian) {
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
            if (!(this._pos + Math.ceil(neededBits / 8) <= this.size())) {
                throw new Error("Index out of bound. Needs " + neededBits + " left: " + (this.size() - this._pos + Math.ceil(neededBits / 8)) + " pos: " + this._pos + " buf_length: " + this.size());
            }
        }
    }
    exports.BinaryReader = BinaryReader;
    function convertToUint8Array(blob) {
        var result = blob instanceof Uint8Array ? blob : new Uint8Array(blob.size);
        if (blob instanceof Uint8Array) {
            return blob;
        }
        for (var i = 0; i < result.length; i++) {
            result[i] = blob[i];
        }
        return result;
    }
    exports.convertToUint8Array = convertToUint8Array;
    function padString(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    exports.padString = padString;
    class BinaryWriter {
        constructor(size = 65536, littleEndian = true) {
            this._buffer = new Uint8Array(size);
            this._pos = 0;
            this._length = 0;
            this.littleEndian = littleEndian;
        }
        length() {
            return this._length;
        }
        seek(pos) {
            if (pos >= this._length) {
                throw new RangeError("Buffer outside of range");
            }
            this._pos = pos;
        }
        position() {
            return this._pos;
        }
        getStream() {
            return this._buffer.slice(0, this._length);
        }
        writeInt8(num) { this._encodeInt(num, 8); }
        writeUInt8(num) { this._encodeInt(num, 8); }
        writeInt16(num) { this._encodeInt(num, 16); }
        writeUInt16(num) { this._encodeInt(num, 16); }
        writeInt32(num) { this._encodeInt(num, 32); }
        writeUInt32(num) { this._encodeInt(num, 32); }
        writeUInt64(num) {
            var numString = num.toString(16);
            numString = padString(numString, 16, '0');
            var hiStr = numString.substring(0, 8);
            var loStr = numString.substring(8, 16);
            var hi = parseInt(hiStr, 16);
            var lo = parseInt(loStr, 16);
            if (this.littleEndian) {
                this._encodeInt(lo, 32);
                this._encodeInt(hi, 32);
            }
            else {
                this._encodeInt(hi, 32);
                this._encodeInt(lo, 32);
            }
        }
        writeBytes(bytes) {
            this._checkSize(bytes.length);
            for (var i = 0; i < bytes.length; i++) {
                this._buffer[this._pos + i] = bytes[i];
            }
            this._pos += bytes.length;
            this._length = Math.max(this._length, this._pos);
        }
        writeByte(byte) {
            var data = byte & 0xFF;
            var array = new Uint8Array(1);
            array[0] = data;
            this.writeBytes(array);
        }
        writeString(str) {
            var byteString = utf8.encode(str);
            var bytes = new Uint8Array(byteString.length);
            for (var i = 0; i < bytes.length; i++) {
                bytes[i] = byteString.charCodeAt(i);
            }
            this.writeBytes(bytes);
        }
        _encodeInt(num, size) {
            if (size % 8 !== 0) {
                throw new TypeError("Invalid number size");
            }
            var numBytes = Math.floor(size / 8);
            var array = new Uint8Array(numBytes);
            for (var i = 0; i < numBytes; i++) {
                var shiftAmount = this.littleEndian ? 8 * i : 8 * (3 - i);
                var byte = (num >> shiftAmount) & 0xFF;
                array[i] = byte;
            }
            this.writeBytes(array);
        }
        _checkSize(size) {
            if (size + this._pos >= this._buffer.length) {
                this._expand();
            }
        }
        _expand() {
            var empty = new Uint8Array(this._buffer.length);
            this._buffer = this._arrayCopy(this._buffer, empty);
        }
        _arrayCopy(src1, src2, dest) {
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
    exports.BinaryWriter = BinaryWriter;
});
define("package", ["require", "exports", "io", "pako"], function (require, exports, IO, pako) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Package {
        constructor(file) {
            this.HEADER_SIZE = 96;
            this.FOURCC = "DBPF";
            this.ZLIB = 0x5A42;
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
        getResourceEntry(tgi) {
            var result = this.ResourceEntryList.find((entry) => {
                return entry.ResourceType == tgi.ResourceType && entry.ResourceType == tgi.ResourceType && entry.ResourceInstance.eq(tgi.ResourceInstance);
            });
            return result;
        }
        getResourceStream(tgi) {
            var block = this.getResourceEntry(tgi);
            if (block) {
                var rawData = this.slice(block.ChunkOffset, block.ChunkOffset + block.FileSize);
                if (block.Compressed == this.ZLIB) {
                    if (rawData[0] != 0x78 && rawData[1] != 0x9C) {
                        throw new TypeError("Invalid Zlib data");
                    }
                    var dataArray = IO.convertToUint8Array(rawData);
                    var result = pako.inflate(dataArray);
                    if (result.length != block.Memsize) {
                        throw new TypeError("Invalid Zlib data");
                    }
                    return result;
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
            this.Compressed = meta & 0xFFFF;
            this.Committed = (meta >> 16) & 0xFFFF;
        }
    }
    exports.TGIResourceBlock = TGIResourceBlock;
    class TGIBlock {
        constructor(type, group, instance) {
            this.ResourceType = type;
            this.ResourceGroup = group;
            this.ResourceInstance = instance;
        }
        eq(tgi) {
            return this.ResourceType == tgi.ResourceType && this.ResourceGroup == tgi.ResourceGroup && this.ResourceInstance.eq(tgi.ResourceInstance);
        }
    }
    exports.TGIBlock = TGIBlock;
    class ResourceWrapper {
        constructor(data) {
            this.parse(data);
        }
        parse(data) {
            this._rawData = data;
        }
        unparse() {
            return this._rawData;
        }
    }
    ResourceWrapper.ResourceType = ['*'];
    exports.ResourceWrapper = ResourceWrapper;
});
define("cas", ["require", "exports", "package", "io"], function (require, exports, Package, IO) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CASPWrapper extends Package.ResourceWrapper {
        parse(data) {
            var br = new IO.BinaryReader(data);
            this.version = br.readUInt32();
            var dataSize = br.readUInt32();
            var tgiPos = br.position() + dataSize;
            this.presetCount = br.readUInt32();
            var charCount = br.readUInt8();
            this.name = br.readString(charCount);
            this.sortPriority = br.readFloat();
            br.readUInt16();
            this.propertyID = br.readUInt32();
            br.readUInt32();
            br.readUInt8();
            if (this.version >= 39) {
                br.readUInt8();
            }
            br.readUInt64();
            if (this.version >= 41) {
                br.readUInt64();
            }
            if (this.version >= 36) {
                br.readUInt64();
            }
            else {
                br.readUInt32();
            }
            var tagCount = br.readUInt32();
            br.readBytes(tagCount * 4);
            br.readUInt32();
            br.readUInt32();
            br.readUInt32();
            br.readUInt8();
            br.readUInt32();
            br.readUInt32();
            br.readUInt32();
            if (this.version >= 0x20) {
                br.readUInt32();
            }
            if (this.version >= 34) {
                br.readInt16();
                br.readUInt8();
                br.readBytes(9);
            }
            else {
                var unused2 = br.readUInt8();
                if (unused2 > 0) {
                    br.readUInt8();
                }
            }
            var colorCount = br.readUInt8();
            this.colorList = new Uint32Array(colorCount);
            for (var i = 0; i < colorCount; i++) {
                this.colorList[i] = br.readUInt32();
            }
            br.readUInt8();
            br.readUInt8();
            if (this.version >= 0x1C) {
                br.readUInt64();
            }
            if (this.version >= 0x1E) {
                var usedMaterialCount = br.readUInt8();
                if (usedMaterialCount > 0) {
                    br.readUInt32();
                    br.readUInt32();
                    br.readUInt32();
                }
            }
            if (this.version >= 0x1F) {
                br.readUInt32();
            }
            if (this.version >= 38) {
                br.readUInt64();
            }
            if (this.version >= 39) {
                br.readUInt64();
            }
            br.readUInt8();
            br.readUInt8();
            br.readUInt32();
            var numLOD = br.readUInt8();
            this.lodList = new Array(numLOD);
            for (var i = 0; i < numLOD; i++) {
                this.lodList[i] = new LOD(br);
            }
            var numSlot = br.readUInt8();
            br.readBytes(numSlot);
            this.diffuseKey = br.readUInt8();
            this.shadowKey = br.readUInt8();
            br.readUInt8();
            br.readUInt8();
            var numOverride = br.readUInt8();
            br.readBytes(5 * numOverride);
            this.normalMapKey = br.readUInt8();
            this.specularMapKey = br.readUInt8();
            if (this.version >= 0x1B) {
                br.readUInt32();
            }
            if (this.version >= 0x1E) {
                br.readUInt8();
            }
            if (this.version >= 42) {
                br.readUInt8();
            }
            if (br.position() != tgiPos) {
                throw new TypeError("Invalid CASP format. \ Version: " + this.version + " \
      TGI position at " + tgiPos + " now at " + br.position());
            }
            var numTGI = br.readUInt8();
            this.tgiList = new Array(numTGI);
            for (var i = 0; i < numTGI; i++) {
                var instance = br.readUInt64();
                var group = br.readUInt32();
                var type = br.readUInt32();
                this.tgiList[i] = new Package.TGIBlock(type, group, instance);
            }
        }
    }
    CASPWrapper.ResourceType = ["0x034AEECB"];
    exports.CASPWrapper = CASPWrapper;
    class LOD {
        constructor(br) {
            this.level = br.readUInt8();
            this.unused = br.readUInt32();
            var numAssets = br.readUInt8();
            this.assets = new Uint32Array(3 * numAssets);
            for (var i = 0; i < numAssets; i++) {
                this.assets[i * 3] = br.readUInt32();
                this.assets[i * 3 + 1] = br.readUInt32();
                this.assets[i * 3 + 2] = br.readUInt32();
            }
            var numLOD = br.readUInt8();
            this.lodKey = new Uint8Array(numLOD);
            for (var i = 0; i < numLOD; i++) {
                this.lodKey[i] = br.readUInt8();
            }
        }
    }
    exports.LOD = LOD;
});
define("rcol", ["require", "exports", "io", "package"], function (require, exports, IO, Package) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class RCOLChunk {
        constructor(data) {
            this._data = data;
            this.parse(data);
        }
        parse(data) {
        }
    }
    exports.RCOLChunk = RCOLChunk;
    class VertexFormat {
        constructor(data) {
            var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
            this.dataType = br.readUInt32();
            this.subType = br.readUInt32();
            this.bytesPerElement = br.readUInt8();
        }
    }
    exports.VertexFormat = VertexFormat;
    var VertexDataType;
    (function (VertexDataType) {
        VertexDataType[VertexDataType["Unknown1"] = 0] = "Unknown1";
        VertexDataType[VertexDataType["Position"] = 1] = "Position";
        VertexDataType[VertexDataType["Normal"] = 2] = "Normal";
        VertexDataType[VertexDataType["UV"] = 3] = "UV";
        VertexDataType[VertexDataType["BoneAssignment"] = 4] = "BoneAssignment";
        VertexDataType[VertexDataType["Unknown2"] = 4] = "Unknown2";
        VertexDataType[VertexDataType["TangentNormal"] = 6] = "TangentNormal";
        VertexDataType[VertexDataType["Color"] = 7] = "Color";
        VertexDataType[VertexDataType["Unknown3"] = 8] = "Unknown3";
        VertexDataType[VertexDataType["Unknown4"] = 9] = "Unknown4";
        VertexDataType[VertexDataType["VertexID"] = 10] = "VertexID";
    })(VertexDataType = exports.VertexDataType || (exports.VertexDataType = {}));
    class Vertex {
        constructor(type, value) {
            this.type = type;
            this.value = value;
        }
        toString() {
            return "Type: " + this.type + "Value: " + this.value.toString();
        }
    }
    exports.Vertex = Vertex;
    class VertexData {
        constructor(data, vertexFormatList) {
            var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
            this.vData = new Array(vertexFormatList.length);
            for (var i = 0; i < vertexFormatList.length; i++) {
                var vf = vertexFormatList[i];
                if (vf.dataType == 1 || vf.dataType == 2 || vf.dataType == 6) {
                    this.vData[i] = new Vertex(vf.dataType, [br.readFloat(), br.readFloat(), br.readFloat()]);
                }
                else if (vf.dataType == 4 || vf.dataType == 5 || vf.dataType == 7 || vf.dataType == 10) {
                    this.vData[i] = new Vertex(vf.dataType, [br.readUInt32()]);
                }
                else if (vf.dataType == 3) {
                    this.vData[i] = new Vertex(vf.dataType, [br.readFloat(), br.readFloat()]);
                }
            }
        }
    }
    exports.VertexData = VertexData;
    class GEOMRCOLChunk extends RCOLChunk {
        parse(data) {
            var br = new IO.BinaryReader(data);
            var fourcc = br.readString(4);
            if (fourcc != GEOMRCOLChunk.FOURCC) {
                throw new TypeError("Invalild GEOM chunk");
            }
            this.version = br.readUInt32();
            var tgiOffset = br.readUInt32();
            var tgiSize = br.readUInt32();
            this.embeddedID = br.readUInt32();
            if (this.embeddedID !== 0) {
                var mtnfSize = br.readUInt32();
                br.readBytes(mtnfSize);
            }
            this.mergeGroup = br.readUInt32();
            this.sortOrder = br.readUInt32();
            var numVerts = br.readInt32();
            var fCount = br.readUInt32();
            this.vertexFormatList = new Array(fCount);
            for (var i = 0; i < fCount; i++) {
                this.vertexFormatList[i] = new VertexFormat(br);
            }
            this.vertexDataList = new Array(numVerts);
            for (var i = 0; i < numVerts; i++) {
                this.vertexDataList[i] = new VertexData(br, this.vertexFormatList);
            }
            var itemCount = br.readUInt32();
            if (itemCount != 1) {
                throw new TypeError("Invalid GEOM. Get itemCount: " + itemCount + " expect 1");
            }
            var bytesPerFacePoint = br.readUInt8();
            if (bytesPerFacePoint != 2) {
                throw new TypeError("Invalid GEOM. Get itemCount: " + bytesPerFacePoint + " expect 2");
            }
            var faceCount = br.readUInt32();
            this.facePointList = new Uint16Array(faceCount);
            for (var i = 0; i < faceCount; i++) {
                this.facePointList[i] = br.readUInt16();
            }
        }
    }
    GEOMRCOLChunk.FOURCC = "GEOM";
    exports.GEOMRCOLChunk = GEOMRCOLChunk;
    class RCOLWrapper extends Package.ResourceWrapper {
        parse(data) {
            var br = new IO.BinaryReader(data);
            this.version = br.readUInt32();
            var internalChunkCount = br.readUInt32();
            this.index3 = br.readUInt32();
            var externalCount = br.readUInt32();
            var internalCount = br.readUInt32();
            this.internalTGIList = new Array(internalCount);
            for (var i = 0; i < internalCount; i++) {
                var instance = br.readUInt64();
                var type = br.readUInt32();
                var group = br.readUInt32();
                this.internalTGIList[i] = new Package.TGIBlock(type, group, instance);
            }
            this.externalTGIList = new Array(externalCount);
            for (var i = 0; i < externalCount; i++) {
                var instance = br.readUInt64();
                var type = br.readUInt32();
                var group = br.readUInt32();
                this.externalTGIList[i] = new Package.TGIBlock(type, group, instance);
            }
            this.rcolChunkList = new Array(internalCount);
            for (var i = 0; i < internalCount; i++) {
                var position = br.readUInt32();
                var size = br.readUInt32();
                var chunkData = data.slice(position, position + size);
                this.rcolChunkList[i] = getRCOLChunk(chunkData);
            }
        }
    }
    exports.RCOLWrapper = RCOLWrapper;
    const RCOLRegister = {
        "*": RCOLChunk,
        "GEOM": GEOMRCOLChunk
    };
    function getRCOLChunk(data) {
        var br = new IO.BinaryReader(data);
        var type = br.readString(4);
        var chunk = RCOLRegister[type];
        if (chunk) {
            var result = new chunk(data);
            return result;
        }
        else {
            return new RCOLChunk(data);
        }
    }
    exports.getRCOLChunk = getRCOLChunk;
});
//# sourceMappingURL=sims4.js.map