import * as IO from './io'
import * as pako from 'pako'

export class Package {
  private _file: File | Uint8Array;
  private _fileSize: number;

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

  private readonly HEADER_SIZE = 96;
  private readonly FOURCC = "DBPF";
  private readonly ZLIB = 0x5A42;

  constructor(file: File | Uint8Array) {
    this._file = file

    var header_blob = this.slice(0, this.HEADER_SIZE);
    var entryCount = this.readHeader(header_blob);

    // read TGI blocks
    this.ResourceEntryList = new Array<TGIResourceBlock>(entryCount);

    var entryData = this.slice(this.IndexPosition);
    var r = new IO.BinaryReader(entryData);
    var indexType = r.readInt32();

    var hdr = new Int32Array(this.hdrsize(indexType));
    var entry = new Int32Array(9 - hdr.length); // Since index type is counted in hdrsize, use 9 instead

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

  private hdrsize(indextype: number) {
    var hc = 1;
    for (var i = 0; i < 4; i++) if ((indextype & (1 << i)) != 0) hc++;
    return hc;
  }

  private slice(pos: number, size?: number) {
    if (this._file instanceof Uint8Array) {
      return size ? this._file.subarray(pos, pos + size) : this._file.subarray(pos);
    } else {
      return size ? this._file.slice(pos, pos + size) : this._file.slice(pos);
    }
  }

  getResourceEntry(tgi: ITGIBlock) : TGIResourceBlock {
    var result = this.ResourceEntryList.find((entry) => {
      return entry.ResourceType == tgi.ResourceType && entry.ResourceType == tgi.ResourceType && entry.ResourceInstance.eq(tgi.ResourceInstance);
    });
    return <TGIResourceBlock>result;
  }

  getResourceStream(tgi: ITGIBlock) {
    var block = this.getResourceEntry(tgi);
    if (block) {
      var rawData = this.slice(block.ChunkOffset, block.ChunkOffset + block.FileSize);
      if (block.Compressed == this.ZLIB) {
        if (rawData[0] != 0x78 && rawData[1] != 0x9C){
          throw new TypeError("Invalid Zlib data");
        }
        var dataArray = IO.convertToUint8Array(rawData);
        var result = pako.inflate(dataArray);
        if (result.length != block.Memsize) {
          throw new TypeError("Invalid Zlib data");
        }
        return result;
      } else {
        return rawData;
      }
    } else {
      return undefined; // not found
    }
  }

  private readHeader(data: Blob | Uint8Array): number {
    var data_size = (data instanceof Uint8Array) ? data.length: data.size;
    if (data_size != this.HEADER_SIZE) {
      throw new TypeError("Wrong header size. Get " + data_size + " expected " + this.HEADER_SIZE)
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

export interface ITGIBlock{
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

  constructor(header: Int32Array, entry: Int32Array) {
    var dataInt = new Uint32Array(header.length + entry.length - 1);
    var type = header[0];
    var countEntry = 0;
    for (var i = 0; i < 8; i++) {
      dataInt[i] = ((type >> i) | 1) != (type >> i) ? dataInt[i] = entry[countEntry++] : dataInt[i] = header[i - countEntry + 1];
    }

    // read the values
    this.ResourceType = dataInt[0];
    this.ResourceGroup = dataInt[1];
    var instanceHi = dataInt[2];
    var instanceLo = dataInt[3];
    this.ResourceInstance = new IO.Uint64(instanceHi, instanceLo);

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

export class TGIBlock implements ITGIBlock{
  ResourceType: number;
  ResourceGroup: number;
  ResourceInstance: IO.Uint64;

  constructor(type: number, group: number, instance: IO.Uint64) {
    this.ResourceType = type;
    this.ResourceGroup = group;
    this.ResourceInstance = instance;
  }

  eq(tgi: ITGIBlock) {
    return this.ResourceType == tgi.ResourceType && this.ResourceGroup == tgi.ResourceGroup && this.ResourceInstance.eq(tgi.ResourceInstance);
  }
}

export class ResourceWrapper{
  private _rawData: Uint8Array | Blob;
  static ResourceType = ['*'];
  
  constructor(data: Uint8Array | Blob) {
    this.parse(data);
  }

  protected parse(data: Uint8Array| Blob) {
    this._rawData = data;
  }

  unparse() {
    return this._rawData;
  }
}