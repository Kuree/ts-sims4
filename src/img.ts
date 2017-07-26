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

enum DDSCaps {
  DDSCaps_Complex = 0x8,
  DDSCaps_Mipmap = 0x400000,
  DDSCaps_Texture = 0x1000
}

export class PixelFormat {
  readonly size: number = 32;
  pixelFormatFlag: PixelFormatFlags;
  RGBBitCount: number;
  redBitMask: number;
  greenBitMask: number;
  blueBitMask: number;
  alphaBitMask: number;
  fourcc: FourCC = FourCC.DXT5;;
  Fourcc: FourCC;

  static readonly StructureSize = 32;

  constructor(data?: Blob | Uint8Array | IO.BinaryReader) {
    if (data) {
      var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
      var size = br.readUInt32();
      if (size != this.size) {
        throw new TypeError("Invalid format");
      }

      this.pixelFormatFlag = br.readUInt32();
      this.fourcc = br.readUInt32();

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

  unParse(w: IO.BinaryWriter) {
    w.writeUInt32(this.size);
    w.writeUInt32(this.pixelFormatFlag);
    w.writeUInt32(this.fourcc);
    w.writeUInt32(this.RGBBitCount);
    w.writeUInt32(this.redBitMask);
    w.writeUInt32(this.greenBitMask);
    w.writeUInt32(this.blueBitMask);
    w.writeUInt32(this.alphaBitMask);
  }

}

export class RLEInfo {
  static readonly Signature = 0x20534444;
  size() { return (18 * 4) + PixelFormat.StructureSize + (5 * 4); }
  headerFlags: HeaderFlags;
  Height: number;
  Width: number;
  PitchOrLinearSize: number;
  Depth: number = 1;
  //mipMapCount { get; internal set; }
  Reserved1: Uint8Array = new Uint8Array(11 * 4);
  pixelFormat: PixelFormat;
  surfaceFlags: number
  cubemapFlags: number;
  reserved2: Uint8Array = new Uint8Array(3 * 4);
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

  unParse(w: IO.BinaryWriter) {
    w.writeUInt32(RLEInfo.Signature);
    w.writeUInt32(this.size());
    w.writeUInt32(this.mipCount > 1 ? this.headerFlags | HeaderFlags.Mipmap | HeaderFlags.LinearSize : this.headerFlags | HeaderFlags.LinearSize);

    w.writeUInt32(this.Height);
    w.writeUInt32(this.Width);

    // PitchOrLinearSize = 0
    var blockSize = this.pixelFormat.Fourcc == FourCC.DST1 || this.pixelFormat.Fourcc == FourCC.DXT1 || this.pixelFormat.Fourcc == FourCC.ATI1 ? 8 : 16;
    w.writeUInt32(Math.floor((Math.max(1, ((this.Width + 3) / 4)) * blockSize) * (Math.max(1, (this.Height + 3) / 4)))); //linear size

    // depth = 1
    w.writeUInt32(1);
    w.writeUInt32(this.mipCount);
    w.writeBytes(this.Reserved1);
    this.pixelFormat.unParse(w);
    w.writeUInt32(this.mipCount > 1 ? DDSCaps.DDSCaps_Complex | DDSCaps.DDSCaps_Mipmap | DDSCaps.DDSCaps_Texture : DDSCaps.DDSCaps_Texture);

    // cubemapFlags
    w.writeUInt32(0);
    w.writeBytes(this.reserved2);
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


export class RLEWrapper extends Package.ResourceWrapper {
  private info: RLEInfo;
  private MipHeaders: Array<MipHeader>;
  private _data: Uint8Array | Blob;

  protected parse(data: Uint8Array | Blob) {
    var br = new IO.BinaryReader(data);
    this.info = new RLEInfo(br);
    this.MipHeaders = new Array<MipHeader>(this.info.mipCount + 1);

    for (var i = 0; i < this.info.mipCount; i++) {
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

    if (this.info.Version == RLEVersion.RLES) {
      this.MipHeaders[this.info.mipCount].Offset1 = this.MipHeaders[0].Offset4;
      this.MipHeaders[this.info.mipCount].Offset4 = br.size();
    } else {
      this.MipHeaders[this.info.mipCount].Offset1 = br.size();
    }

    this._data = data;

  }

  private UncompressDXT5(data: Uint8Array) {
    var imageData = new ImageData(this.info.Width, this.info.Height);

    var r = new IO.BinaryReader(data);
    for (var j = 0; j < this.info.Height; j += 4) {
      for (var i = 0; i < this.info.Width; i += 4) {
        this.DecompressBlockDXT5(i, j, r.readBytes(16), imageData);
      }
    }

    return imageData;
  }

  private DecompressBlockDXT5(x, y, blockStorage: Uint8Array, imageData: ImageData) {
    var alpha0 = blockStorage[0];
    var alpha1 = blockStorage[1];

    var bitOffset = 2;
    var alphaCode1 = (blockStorage[bitOffset + 2] | (blockStorage[bitOffset + 3] << 8) | (blockStorage[bitOffset + 4] << 16) | (blockStorage[bitOffset + 5] << 24)) & 0xFFFFFFFF;
    var alphaCode2 = (blockStorage[bitOffset + 0] | (blockStorage[bitOffset + 1] << 8)) & 0xFFFF;

    var color0 = (blockStorage[8] | blockStorage[9] << 8) & 0xFFFF;
    var color1 = (blockStorage[10] | blockStorage[11] << 8) & 0xFFFF;

    var temp;

    temp = (color0 >> 11) * 255 + 16;
    var r0 = 0xFF & ((temp / 32 + temp) / 32);
    temp = ((color0 & 0x07E0) >> 5) * 255 + 32;
    var g0 = 0xFF & ((temp / 64 + temp) / 64);
    temp = (color0 & 0x001F) * 255 + 16;
    var b0 = 0xFF & ((temp / 32 + temp) / 32);

    temp = (color1 >> 11) * 255 + 16;
    var r1 = 0xFF & ((temp / 32 + temp) / 32);
    temp = ((color1 & 0x07E0) >> 5) * 255 + 32;
    var g1 = 0xFF & ((temp / 64 + temp) / 64);
    temp = (color1 & 0x001F) * 255 + 16;
    var b1 = 0xFF & ((temp / 32 + temp) / 32);

    var code = 0xFFFFFFFF & (blockStorage[12] | blockStorage[13] << 8 | blockStorage[14] << 16 | blockStorage[15] << 24);

    for (var j = 0; j < 4; j++) {
      for (var i = 0; i < 4; i++) {
        var alphaCodeIndex = 3 * (4 * j + i);
        var alphaCode;

        if (alphaCodeIndex <= 12) {
          alphaCode = (alphaCode2 >> alphaCodeIndex) & 0x07;
        }
        else if (alphaCodeIndex == 15) {
          alphaCode = 0xFFFFFFFF & ((alphaCode2 >> 15) | ((alphaCode1 << 1) & 0x06));
        }
        else {
          alphaCode = 0xFFFFFFFF & ((alphaCode1 >> (alphaCodeIndex - 16)) & 0x07);
        }

        var finalAlpha;
        if (alphaCode == 0) {
          finalAlpha = alpha0;
        }
        else if (alphaCode == 1) {
          finalAlpha = alpha1;
        }
        else {
          if (alpha0 > alpha1) {
            finalAlpha = 0xFF & (((8 - alphaCode) * alpha0 + (alphaCode - 1) * alpha1) / 7);
          }
          else {
            if (alphaCode == 6)
              finalAlpha = 0;
            else if (alphaCode == 7)
              finalAlpha = 255;
            else
              finalAlpha = 0xFF & (((6 - alphaCode) * alpha0 + (alphaCode - 1) * alpha1) / 5);
          }
        }

        var colorCode = 0xFF & ((code >> 2 * (4 * j + i)) & 0x03);

        var r: number;
        var g: number;
        var b: number;
        var a = finalAlpha;
        switch (colorCode) {
          case 0:
            r = r0;
            g = g0;
            b = b0;
            break;
          case 1:
            r = r1;
            g = g1;
            b = b1;
            break;
          case 2:
            r = (2 * r0 + r1) / 3;
            g = (2 * g0 + g1) / 3;
            b = (2 * b0 + b1) / 3;
            break;
          case 3:
            r = (r0 + 2 * r1) / 3;
            g = (g0 + 2 * g1) / 3;
            b = (b0 + 2 * b1) / 3;
            break;
        }
        var width = this.info.Width;
        var height = this.info.Height;
        var index = (x + i + (y + j) * width) * 4;
        var value = [r, g, b, a];
        imageData.data.set(value, index);
      }
    }
  }

  public toImageData() {
    var dds = this.toDDS();
    return this.UncompressDXT5(dds.subarray(128));
  }

  public toDDS(): Uint8Array {
    var w = new IO.BinaryWriter();
    this.info.unParse(w);

    var fullTransparentAlpha = Uint8Array.from([0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    var fullTransparentColor = Uint8Array.from([0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    var fullOpaqueAlpha = Uint8Array.from([0x00, 0x05, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

    if (this.info.Version != RLEVersion.RLE2) {
      throw new Error("Format other than RLE2 is not supported");
    }

    for (var i = 0; i < this.info.mipCount; i++) {
      var mipHeader = this.MipHeaders[i];
      var nextMipHeader = this.MipHeaders[i + 1];

      var blockOffset2, blockOffset3, blockOffset0, blockOffset1;
      blockOffset2 = mipHeader.Offset2;
      blockOffset3 = mipHeader.Offset3;
      blockOffset0 = mipHeader.Offset0;
      blockOffset1 = mipHeader.Offset1;

      for (var commandOffset = mipHeader.CommandOffset;
        commandOffset < nextMipHeader.CommandOffset;
        commandOffset += 2) {
        var command = IO.BitConverter.toUInt16(this._data, commandOffset);

        var op = command & 3;
        var count = command >> 2;

        if (op == 0) {
          for (var j = 0; j < count; j++) {
            w.writeBytes(fullTransparentAlpha.slice(0, 8));
            w.writeBytes(fullTransparentAlpha.slice(0, 8));
          }
        }
        else if (op == 1) {
          for (var j = 0; j < count; j++) {
            //output.Write(fullOpaqueAlpha, 0, 8);
            //output.Write(fullTransparentColor, 0, 8);

            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset0, blockOffset0 + 2)));
            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset1, blockOffset1 + 6)));
            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset2, blockOffset2 + 4)));
            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset3, blockOffset3 + 4)));
            blockOffset2 += 4;
            blockOffset3 += 4;
            blockOffset0 += 2;
            blockOffset1 += 6;
          }
        }
        else if (op == 2) {
          for (var j = 0; j < count; j++) {
            w.writeBytes(fullOpaqueAlpha.slice(0, 8));
            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset2, blockOffset2 + 4)));
            w.writeBytes(IO.convertToUint8Array(this._data.slice(blockOffset3, 4)));
            blockOffset2 += 4;
            blockOffset3 += 4;
          }
        }
        else {
          throw new Error("Not supported");
        }
      }

      if (blockOffset0 != nextMipHeader.Offset0 ||
        blockOffset1 != nextMipHeader.Offset1 ||
        blockOffset2 != nextMipHeader.Offset2 ||
        blockOffset3 != nextMipHeader.Offset3) {
        throw new Error("Invalid operation");
      }
    }


    return w.getBuffer();
  }
}