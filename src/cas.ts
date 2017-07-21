import * as Package from './package'
import * as IO from './io'

export class CASPWrapper extends Package.ResourceWrapper {
  static ResourceType = ["0x034AEECB"];

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
  lodList: Array<LOD>
  tgiList: Array<Package.ITGIBlock>;

  protected parse(data: Uint8Array) {
    var br = new IO.BinaryReader(data);
    this.version = br.readUInt32();
    var dataSize = br.readUInt32();
    var tgiPos = br.position() + dataSize;

    this.presetCount = br.readUInt32();
    var charCount = br.readUInt8();
    this.name = br.readString(charCount);

    // They're not needed for now
    this.sortPriority = br.readFloat();   // sortPriority
    br.readUInt16();  // secondarySortIndex
    this.propertyID = br.readUInt32();  // propertyID
    br.readUInt32();  // auralMaterialHash
    br.readUInt8();   //parmflags

    // parmFlags2
    if (this.version >= 39) { br.readUInt8(); }

    // excludePartFlags
    br.readUInt64();

    // excludePartFlags2
    if (this.version >= 41) { br.readUInt64(); }

    // excludeModifierRegionFlags
    if (this.version >= 36) { br.readUInt64(); }
    else { br.readUInt32(); }

    // flags
    var tagCount = br.readUInt32();
    br.readBytes(tagCount * 4);

    br.readUInt32();  // deprecatedPrice
    br.readUInt32();  // partTitleKey
    br.readUInt32();  // partDesptionKey
    br.readUInt8();   // unique texture space
    br.readUInt32();  // bodyType
    br.readUInt32();  // bodySubType
    br.readUInt32(); // age gender
    
    if (this.version >= 0x20) {
      br.readUInt32();
    }
    if (this.version >= 34) {
      br.readInt16();
      br.readUInt8();
      br.readBytes(9);
    } else {
      var unused2 = br.readUInt8();
      if (unused2 > 0) { br.readUInt8(); }
    }

    var colorCount = br.readUInt8();
    this.colorList = new Uint32Array(colorCount);
    for (var i = 0; i < colorCount; i++) {
      this.colorList[i] = br.readUInt32();
    }

    br.readUInt8();   // buffResKey
    br.readUInt8();   // varientThumbnailKey

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

    br.readUInt8();   // naked key
    br.readUInt8();   // parent key
    br.readUInt32();  // sortLayer

    var numLOD = br.readUInt8();
    this.lodList = new Array<LOD>(numLOD);
    for (var i = 0; i < numLOD; i++) {
      this.lodList[i] = new LOD(br);
    }

    // slot
    var numSlot = br.readUInt8();
    br.readBytes(numSlot);

    this.diffuseKey = br.readUInt8();
    this.shadowKey = br.readUInt8();
    br.readUInt8(); // compositionMethod
    br.readUInt8(); // regionMapKey

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
    this.tgiList = new Array<Package.ITGIBlock>(numTGI);
    for (var i = 0; i < numTGI; i++) {
      var instance = br.readUInt64();
      var group = br.readUInt32();
      var type = br.readUInt32();
      this.tgiList[i] = new Package.TGIBlock(type, group, instance);
    }
  }
}


export class LOD {
  level: number;
  unused: number;

  assets: Uint32Array;
  lodKey: Uint8Array

  constructor(br: IO.BinaryReader) {
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