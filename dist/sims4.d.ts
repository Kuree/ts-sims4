/// <reference types="bignumber.js" />
declare module "io" {
    export default class BinaryReader {
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
        readBytes(size: number): Uint8Array;
        readChar(): string;
        readString(length: number): string;
        seek(pos: number): void;
        getPosition(): number;
        getSize(): number;
        private _shuffle(num, size);
        private _decodeFloat(precisionBits, exponentBits);
        private _readByte(i, size);
        private _decodeBigNumber();
        private _decodeInt(bits, signed);
        private _shl(a, b);
        private _readBits(start, length, size);
        private _checkSize(neededBits);
    }
}
declare class Package {
    private _file;
    private _fileSize;
    readonly Major: number;
    readonly Unknown1: Int8Array;
    readonly Unknown2: number;
    IndexSize: number;
    readonly Unknown3: Int8Array;
    readonly IndexVersion: number;
    IndexPosition: number;
    readonly Unknown4: Int8Array;
    private readonly HEADER_SIZE;
    constructor(file: File | Uint8Array);
    readHeader(blob: Blob): void;
}
