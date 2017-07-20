/// <reference types="bignumber.js" />
declare module "io" {
    import * as BigNum from 'bignumber.js';
    export class BinaryReader {
        private _pos;
        private _buffer;
        littleEndian: boolean;
        constructor(data: Blob | Uint8Array, littleEndian?: boolean);
        readInt8(): number;
        readUInt8(): number;
        readInt16(): number;
        readUInt16(): number;
        readInt32(): number;
        readUInt32(): number;
        readUInt64(): BigNumber.BigNumber;
        readFloat(): number;
        readDouble(): number;
        readBytes(size: number): Uint8Array;
        readChar(): string;
        readString(length: number): string;
        seek(pos: number): void;
        position(): number;
        size(): number;
        private _shuffle(num, size);
        private _decodeFloat(precisionBits, exponentBits);
        private _readByte(i, size);
        static combineUint64(hi: number, lo: number): BigNumber.BigNumber;
        private _decodeBigNumber();
        private _decodeInt(bits, signed);
        private _shl(a, b);
        private _readBits(start, length, size);
        private _checkSize(neededBits);
    }
    export function convertToUint8Array(blob: Blob | Uint8Array): Uint8Array;
    export function padString(n: any, width: any, z: any): any;
    export class BinaryWriter {
        private _buffer;
        private _pos;
        private _length;
        littleEndian: boolean;
        constructor(size?: number, littleEndian?: boolean);
        length(): number;
        seek(pos: number): void;
        position(): number;
        getStream(): Uint8Array;
        writeInt8(num: number): void;
        writeUInt8(num: number): void;
        writeInt16(num: number): void;
        writeUInt16(num: number): void;
        writeInt32(num: number): void;
        writeUInt32(num: number): void;
        writeUInt64(num: BigNum.BigNumber): void;
        writeBytes(bytes: Uint8Array): void;
        writeByte(byte: number): void;
        writeString(str: string): void;
        private _encodeInt(num, size);
        private _checkSize(size);
        private _expand();
        private _arrayCopy(src1, src2, dest?);
    }
}
declare module "package" {
    import * as BigNum from 'bignumber.js';
    export class Package {
        private _file;
        private _fileSize;
        Major: number;
        Minor: number;
        Unknown1: Uint8Array;
        Unknown2: number;
        IndexSize: number;
        Unknown3: Uint8Array;
        IndexVersion: number;
        IndexPosition: number;
        Unknown4: Uint8Array;
        ResourceEntryList: Array<ITGIBlock>;
        private readonly HEADER_SIZE;
        private readonly FOURCC;
        private readonly ZLIB;
        constructor(file: File | Uint8Array);
        private hdrsize(indextype);
        private slice(pos, size?);
        getResourceEntry(tgi: ITGIBlock): TGIResourceBlock;
        getResourceStream(tgi: ITGIBlock): Uint8Array | Blob;
        private readHeader(data);
    }
    export interface ITGIBlock {
        ResourceType: number;
        ResourceGroup: number;
        ResourceInstance: BigNum.BigNumber;
    }
    export class TGIResourceBlock implements ITGIBlock {
        ResourceType: number;
        ResourceGroup: number;
        ResourceInstance: BigNum.BigNumber;
        FileSize: number;
        Memsize: number;
        Compressed: number;
        ChunkOffset: number;
        Unknown1: number;
        Committed: number;
        constructor(header: Int32Array, entry: Int32Array);
    }
    export class TGIBlock implements ITGIBlock {
        ResourceType: number;
        ResourceGroup: number;
        ResourceInstance: BigNum.BigNumber;
        constructor(type: number, group: number, instance: BigNum.BigNumber);
    }
    export class ResourceWrapper {
        private _rawData;
        static ResourceType: string[];
        constructor(data: Uint8Array | Blob);
        protected parse(data: Uint8Array | Blob): void;
        unparse(): Uint8Array | Blob;
    }
}
declare module "cas" {
    import * as Package from "package";
    import * as IO from "io";
    export class CASPWrapper extends Package.ResourceWrapper {
        static ResourceType: string[];
        version: number;
        presetCount: number;
        name: string;
        diffuseKey: number;
        shadowKey: number;
        normalMapKey: number;
        specularMapKey: number;
        colorList: Uint32Array;
        lodList: Array<LOD>;
        tgiList: Array<Package.ITGIBlock>;
        protected parse(data: Uint8Array): void;
    }
    export class LOD {
        level: number;
        unused: number;
        assets: Uint32Array;
        lodKey: Uint8Array;
        constructor(br: IO.BinaryReader);
    }
}
