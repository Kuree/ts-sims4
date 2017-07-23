import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as Package from '../src/package'
import * as IO from '../src/io'
import * as RCOL from '../src/rcol'

describe("Test RCOL load", () => {
  it("get default RCOL chunk", () => {
    var data = new Uint8Array(4);
    var chunk = RCOL.getRCOLChunk(data);
    assert(chunk != undefined);
  });

  it("get GEOM RCOL chunk", () => {
    var data = new Uint8Array(100);
    var str = "GEOM";
    for (var i = 0; i < 4; i++) {
      data[i] = str.charCodeAt(i);
    }
    data[36] = 1; // bypass the data check
    data[40] = 2;
    var chunk = RCOL.getRCOLChunk(data);
    assert(chunk != undefined);
    expect(chunk).instanceof(RCOL.GEOMRCOLChunk);
  });
});

describe("Test GEOM Wrapper", () => {
  var stream = fs.readFileSync("test/files/ymShoes_AnkleWork_Brown.simgeom");
  it("Parse GEOM", () => {
    var geom = new RCOL.RCOLWrapper(stream);
    expect(geom.version).to.equal(3);
    expect(geom.rcolChunkList.length).to.equal(1);
    var chunk = <RCOL.GEOMRCOLChunk>geom.rcolChunkList[0];
    expect(chunk.version).to.equal(0xC);
    expect(chunk.embeddedID).to.equal(0x548394B9);
    expect(chunk.vertexDataList.length).to.equal(0x15D);
    var vertexData = chunk.vertexDataList[chunk.vertexDataList.length - 1].vData[3]; // the last one ?
    expect(vertexData.value[0]).to.equal(-0.31371599435806274);
    expect(vertexData.type).to.equal(RCOL.VertexDataType.UV);

    expect(chunk.facePointList.length).to.equal(0x1D0 * 3);
    var lastFacePoint = chunk.facePointList[chunk.facePointList.length - 1];
    expect(lastFacePoint).to.equal(0x0159);
  });
  it("Three.Js helper functions", () => {
    var geom = new RCOL.RCOLWrapper(stream);
    var chunk = <RCOL.GEOMRCOLChunk>geom.rcolChunkList[0];
    var jsonData = chunk.getThreeJsJSONData();
    expect(jsonData.vertices.length).to.equal(0x15D * 3);
    // expect(vertexData.uv.length).to.equal(0x15D * 2);
    // expect(vertexData.normal.length).to.equal(0x15D * 3);
    expect(jsonData.faces.length).to.equal(0x1D0 * 10);
  });

});