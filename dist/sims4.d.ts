/// <reference types="bignumber.js" />
declare module "interface" {
    import * as BigNum from 'bignumber.js';
    export interface ITGIBlock {
        ResourceType: number;
        ResourceGroup: number;
        ResourceInstance: BigNum.BigNumber;
    }
}
declare module "io" {
    export class BinaryReader {
        private _pos;
        private _buffer;
        private _littleEndian;
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
        static convertToUint8Array(blob: Blob | Uint8Array): Uint8Array;
        readBytes(size: number): Uint8Array;
        readChar(): string;
        readString(length: number): string;
        seek(pos: number): void;
        getPosition(): number;
        getSize(): number;
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
}
declare module "package" {
    import * as Interface from "interface";
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
        ResourceEntryList: Array<Interface.ITGIBlock>;
        private readonly HEADER_SIZE;
        private readonly FOURCC;
        private readonly ZLIB;
        constructor(file: File | Uint8Array);
        private hdrsize(indextype);
        private slice(pos, size?);
        getResourceStream(tgi: Interface.ITGIBlock): Uint8Array | Blob;
        private readHeader(data);
    }
    export class TGIResourceBlock implements Interface.ITGIBlock {
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
}
