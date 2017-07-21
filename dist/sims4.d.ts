declare module "io" {
    export class Uint64 {
        hi: number;
        lo: number;
        constructor(hi: number, lo: number);
        eq(num: Uint64): boolean;
        toString(): string;
    }
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
        readUInt64(): Uint64;
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
        writeUInt64(num: Uint64): void;
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
    import * as IO from "io";
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
        ResourceInstance: IO.Uint64;
    }
    export class TGIResourceBlock implements ITGIBlock {
        ResourceType: number;
        ResourceGroup: number;
        ResourceInstance: IO.Uint64;
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
        ResourceInstance: IO.Uint64;
        constructor(type: number, group: number, instance: IO.Uint64);
        eq(tgi: ITGIBlock): boolean;
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
        sortPriority: number;
        propertyID: number;
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
declare module "rcol" {
    import * as IO from "io";
    import * as Package from "package";
    export class RCOLChunk {
        protected _data: Uint8Array | Blob;
        constructor(data: Uint8Array | Blob);
        protected parse(data: Uint8Array | Blob): void;
    }
    export class VertexFormat {
        dataType: VertexDataType;
        subType: number;
        bytesPerElement: number;
        constructor(data: Uint8Array | Blob | IO.BinaryReader);
    }
    export enum VertexDataType {
        Unknown1 = 0,
        Position = 1,
        Normal = 2,
        UV = 3,
        BoneAssignment = 4,
        Unknown2 = 4,
        TangentNormal = 6,
        Color = 7,
        Unknown3 = 8,
        Unknown4 = 9,
        VertexID = 10,
    }
    export class Vertex {
        type: VertexDataType;
        value: Array<number>;
        constructor(type: VertexDataType, value: number[]);
        toString(): string;
    }
    export class VertexData {
        vData: Array<Vertex>;
        constructor(data: Uint8Array | Blob | IO.BinaryReader, vertexFormatList: Array<VertexFormat>);
    }
    export class SimpleVertex {
        position: Float32Array;
        uv: Float32Array;
        normal: Float32Array;
        constructor(pos: any, uv: any, normal: any);
    }
    export class GEOMRCOLChunk extends RCOLChunk {
        static FOURCC: string;
        version: number;
        embeddedID: number;
        mergeGroup: number;
        sortOrder: number;
        vertexFormatList: Array<VertexFormat>;
        vertexDataList: Array<VertexData>;
        facePointList: Uint16Array;
        parse(data: Uint8Array | Blob): void;
        getVertexData(): Array<SimpleVertex>;
        getFaceData(): Array<number[]>;
    }
    export class RCOLWrapper extends Package.ResourceWrapper {
        version: number;
        index3: number;
        internalTGIList: Array<Package.ITGIBlock>;
        externalTGIList: Array<Package.ITGIBlock>;
        rcolChunkList: Array<RCOLChunk>;
        protected parse(data: Uint8Array | Blob): void;
    }
    export function getRCOLChunk(data: Uint8Array | Blob): RCOLChunk;
}
