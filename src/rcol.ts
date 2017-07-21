import * as IO from './io'
import * as Package from './package'


export class RCOLChunk {
  protected _data: Uint8Array | Blob;

  constructor(data: Uint8Array | Blob) {
    this._data = data;
    this.parse(data);
  }

  protected parse(data: Uint8Array | Blob) {

  }
}


export class VertexFormat {
  dataType: VertexDataType;
  subType: number;
  bytesPerElement: number;

  constructor(data: Uint8Array | Blob | IO.BinaryReader) {
    var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
    this.dataType = <VertexDataType>br.readUInt32();
    this.subType = br.readUInt32();
    this.bytesPerElement = br.readUInt8();
  }
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
  VertexID = 10
}


export class Vertex {
  type: VertexDataType;
  value: Array<number>;

  constructor(type: VertexDataType, value: number[]) {
    this.type = type;
    this.value = value;
  }

  toString() {
    return "Type: " + this.type + "Value: " + this.value.toString();
  }
}

export class VertexData {
  vData: Array<Vertex>;

  constructor(data: Uint8Array | Blob | IO.BinaryReader, vertexFormatList: Array<VertexFormat>) {
    var br = data instanceof IO.BinaryReader ? data : new IO.BinaryReader(data);
    this.vData = new Array<Vertex>(vertexFormatList.length);
    for (var i = 0; i < vertexFormatList.length; i++) {
      var vf = vertexFormatList[i];
      // TODO:
      // clean this up by using enum
      if (vf.dataType == 1 || vf.dataType == 2 || vf.dataType == 6) {
        this.vData[i] = new Vertex(vf.dataType, [br.readFloat(), br.readFloat(), br.readFloat()]);
      } else if (vf.dataType == 4 || vf.dataType == 5 || vf.dataType == 7 || vf.dataType == 10) {
        this.vData[i] = new Vertex(vf.dataType, [br.readUInt32()]);
      } else if (vf.dataType == 3) {
        this.vData[i] = new Vertex(vf.dataType, [br.readFloat(), br.readFloat()]);
      }

    }
  }
}

export class SimpleVertex{
  position: Float32Array;
  uv: Float32Array;
  normal: Float32Array;

  constructor(pos, uv, normal) {
    this.position = pos;
    this.uv = uv;
    this.normal = normal;
  }
}


export class GEOMRCOLChunk extends RCOLChunk {
  static FOURCC = "GEOM";

  version: number;
  embeddedID: number;
  mergeGroup: number;
  sortOrder: number;

  vertexFormatList: Array<VertexFormat>;
  vertexDataList: Array<VertexData>;

  facePointList: Uint16Array;

  parse(data: Uint8Array | Blob) {
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
      // MTNF block
      var mtnfSize = br.readUInt32();
      br.readBytes(mtnfSize);
    }

    this.mergeGroup = br.readUInt32();
    this.sortOrder = br.readUInt32();

    var numVerts = br.readInt32();
    var fCount = br.readUInt32();

    this.vertexFormatList = new Array<VertexFormat>(fCount);
    for (var i = 0; i < fCount; i++) {
      this.vertexFormatList[i] = new VertexFormat(br);
    }

    this.vertexDataList = new Array<VertexData>(numVerts);
    for (var i = 0; i < numVerts; i++) {
      this.vertexDataList[i] = new VertexData(br, this.vertexFormatList);
    }

    //console.log(this.vertexDataList[this.vertexDataList.length - 1].vData);

    var itemCount = br.readUInt32();
    if (itemCount != 1) {
      throw new TypeError("Invalid GEOM. Get itemCount: " + itemCount + " expect 1");
    }
    var bytesPerFacePoint = br.readUInt8();
    if (bytesPerFacePoint != 2) {
      throw new TypeError("Invalid GEOM. Get itemCount: " + bytesPerFacePoint + " expect 2");
    }

    // three sets form a face
    var faceCount = br.readUInt32();
    this.facePointList = new Uint16Array(faceCount);
    for (var i = 0; i < faceCount; i++){
      this.facePointList[i] = br.readUInt16();
    }
  }

  getVertexData(): Array<SimpleVertex> {
    var numVertex = this.vertexDataList.length
    var result = new Array<SimpleVertex>(numVertex);
    for (var i = 0; i < numVertex; i++){
      var v = this.vertexDataList[i];
      var posV = v.vData.find(entry => { return entry.type === VertexDataType.Position; });
      if (!posV) { continue; } // malformed data?
      var uvV = v.vData.find(entry => { return entry.type === VertexDataType.UV; });
      if (!uvV) { continue; }
      var normalV = v.vData.find(entry => { return entry.type === VertexDataType.Normal; });
      if (!normalV) { continue; }
      result[i] = new SimpleVertex(posV.value, uvV.value, normalV.value);
    }
    return result;
  }

  getFaceData(): Array<number[]>{
    var list = this.facePointList;
    var result = new Array<number[]>(list.length / 3);
    for (var i = 0; i < result.length; i += 3){
      var value1 = list[i];
      var value2 = list[i + 1];
      var value3 = list[i + 2];
      result[i / 3] = [value1, value2, value3];
    }

    return result
  }
}

export class RCOLWrapper extends Package.ResourceWrapper {
  version: number;
  index3: number;

  internalTGIList: Array<Package.ITGIBlock>;
  externalTGIList: Array<Package.ITGIBlock>;

  rcolChunkList: Array<RCOLChunk>;

  protected parse(data: Uint8Array | Blob) {
    var br = new IO.BinaryReader(data);
    this.version = br.readUInt32();

    var internalChunkCount = br.readUInt32();
    this.index3 = br.readUInt32();
    var externalCount = br.readUInt32();
    var internalCount = br.readUInt32();

    this.internalTGIList = new Array<Package.ITGIBlock>(internalCount);
    for (var i = 0; i < internalCount; i++) {
      var instance = br.readUInt64();
      var type = br.readUInt32();
      var group = br.readUInt32();
      this.internalTGIList[i] = new Package.TGIBlock(type, group, instance);
    }

    this.externalTGIList = new Array<Package.ITGIBlock>(externalCount);
    for (var i = 0; i < externalCount; i++) {
      var instance = br.readUInt64();
      var type = br.readUInt32();
      var group = br.readUInt32();
      this.externalTGIList[i] = new Package.TGIBlock(type, group, instance);
    }

    this.rcolChunkList = new Array<RCOLChunk>(internalCount);
    for (var i = 0; i < internalCount; i++) {
      var position = br.readUInt32();
      var size = br.readUInt32();
      var chunkData = data.slice(position, position + size)
      this.rcolChunkList[i] = getRCOLChunk(chunkData)
    }

  }
}




const RCOLRegister = {
  "*": RCOLChunk,
  "GEOM": GEOMRCOLChunk
}


export function getRCOLChunk(data: Uint8Array | Blob) {
  var br = new IO.BinaryReader(data);
  var type = br.readString(4);
  var chunk = RCOLRegister[type];
  if (chunk) {
    var result = new chunk(data);
    return <RCOLChunk>result;
  } else {
    return new RCOLChunk(data);
  }
}

