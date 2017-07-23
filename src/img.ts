import * as IO from './io'
import * as Package from './package'

/*
This RLE wrapper is adpated from
https://github.com/s4ptacle/Sims4Tools/blob/develop/s4pi%20Wrappers/ImageResource/RLEResource.cs
 */

export enum RLEVersion {
  RLE2 = 0x32454C52,
  RLES = 0x53454C52
}

export enum FourCC {
  DST1 = 0x31545344,
  DST3 = 0x33545344,
  DST5 = 0x35545344,
  DXT1 = 0x31545844,
  DXT3 = 0x33545844,
  DXT5 = 0x35545844,
  ATI1 = 0x31495441,
  ATI2 = 0x32495441,
  None = 0x00000000
}

export enum HeaderFlags {
  Texture = 0x00001007, // DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT 
  Mipmap = 0x00020000, // DDSD_MIPMAPCOUNT
  Volume = 0x00800000, // DDSD_DEPTH
  Pitch = 0x00000008, // DDSD_PITCH
  LinearSize = 0x00080000, // DDSD_LINEARSIZE
}

export enum PixelFormatFlags {
  FourCC = 0x00000004,
  RGB = 0x00000040,
  RGBA = 0x00000041,
  Luminance = 0x00020000,
}

export class PixelFormat {
  readonly size: number = 32;
  pixelFormatFlag: PixelFormatFlags;
  Fourcc: FourCC;
  RGBBitCount: number;
  redBitMask: number;
  greenBitMask: number;
  blueBitMask: number;
  alphaBitMask: number;
  fourcc: FourCC;

  static readonly StructureSize = 32;

  constructor(data?: Blob | Uint8Array | IO.BinaryReader) {
    if (data) {
      var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
      var size = br.readUInt32();
      if (size != this.size) {
        throw new TypeError("Invalid format");
      }

      this.pixelFormatFlag = br.readUInt32();
      var fourcc = br.readUInt32();

      this.RGBBitCount = br.readUInt32();
      this.redBitMask = br.readUInt32();
      this.greenBitMask = br.readUInt32();
      this.blueBitMask = br.readUInt32();
      this.alphaBitMask = br.readUInt32();
    } else {
      this.RGBBitCount = 32;
      this.redBitMask = 0x00FF0000;
      this.greenBitMask = 0x0000FF00;
      this.blueBitMask = 0x000000FF;
      this.alphaBitMask = 0xFF000000;
    }
  }

}

export class RLEInfo {
  readonly Signature = 0x20534444;
  size() { return (18 * 4) + PixelFormat.StructureSize + (5 * 4); }
  headerFlags: HeaderFlags;
  Height: number;
  Width: number;
  PitchOrLinearSize: number;
  Depth: number = 1;
  //mipMapCount { get; internal set; }
  Reserved1: Uint8Array;
  pixelFormat: PixelFormat;
  surfaceFlags: number
  cubemapFlags: number;
  reserved2: Uint8Array;
  Version: RLEVersion
  HasSpecular: boolean;
  mipCount: number;
  Unknown0E: number;

  constructor(data: Blob | Uint8Array | IO.BinaryReader) {
    var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
    br.seek(0);
    var fourcc = br.readUInt32();
    this.Version = br.readUInt32();
    this.Width = br.readUInt16();
    this.Height = br.readUInt16();
    this.mipCount = br.readUInt16();
    this.Unknown0E = br.readUInt16();
    this.headerFlags = HeaderFlags.Texture;
    if (this.Unknown0E !== 0) { throw new TypeError("Invalid data at position " + br.position()); }
    this.pixelFormat = new PixelFormat();
  }
}

export class MipHeader {
  CommandOffset: number;
  Offset0: number;
  Offset1: number;
  Offset2: number;
  Offset3: number;
  Offset4: number;
}


export class RLEWrapper extends Package.ResourceWrapper{
  private info: RLEInfo;
  private MipHeaders: Array<MipHeader>;
 

  protected parse(data: Uint8Array | Blob) {
    var br = new IO.BinaryReader(data);
    this.info = new RLEInfo(br);
    this.MipHeaders = new Array<MipHeader>(this.info.mipCount + 1);

    for (var i = 0; i < this.info.mipCount; i++){
      var header = new MipHeader();
      header.CommandOffset = br.readInt32();
      header.Offset2 = br.readInt32();
      header.Offset3 = br.readInt32();
      header.Offset0 = br.readInt32();
      header.Offset1 = br.readInt32();
      this.MipHeaders[i] = header;
    }

    var header = new MipHeader();
    header.CommandOffset = this.MipHeaders[0].Offset2;
    header.Offset2 = this.MipHeaders[0].Offset3;
    header.Offset3 = this.MipHeaders[0].Offset0;
    header.Offset0 = this.MipHeaders[0].Offset1;
    this.MipHeaders[this.info.mipCount] = header;


  }
}