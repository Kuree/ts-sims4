import * as IO from './io'
import * as Interface from './interface'
import * as BigNum from 'bignumber.js'

export default class Package {
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

  private readonly HEADER_SIZE = 96;
  private readonly FOURCC = "DBPF";

  constructor(file: File | Uint8Array) {
    var header_blob = this.slice(file, 0, this.HEADER_SIZE);
    var entryCount = this.readHeader(header_blob);

    // read TGI blocks

  }

  private slice(buffer: Uint8Array | Blob, pos: number, size: number) {
    if (buffer instanceof Uint8Array) {
      return buffer.subarray(pos, pos + size);
    } else {
      return buffer.slice(pos, pos + size);
    }
  }


  readHeader(data: Blob | Uint8Array): number {
    var data_size = (data instanceof Blob) ? data.size : data.length;
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

export class TGIResourceBlock implements Interface.ITGIBlock {
  ResourceType: number;
  ResourceGroup: number;
  ResourceInstance: BigNum.BigNumber;

  FileSize: number;
  Memsize: number;
  Compressed: boolean;
  
}