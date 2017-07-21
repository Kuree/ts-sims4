import { expect, assert } from 'chai';
import 'mocha'
import * as IO from '../src/io'

describe("Test BinaryReader", () => {
  it("readInt8() - readUInt8()", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 42;
    array[1] = 42;
    var br = new IO.BinaryReader(array, false);
    expect(br.readInt8()).to.equal(42);
    expect(br.readUInt8()).to.equal(42);
  });

  it("readUInt16() - little endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 2;
    array[1] = 4;
    var br = new IO.BinaryReader(array);
    expect(br.readUInt16()).to.equal(4 * 256 + 2);
  });

  it("readUInt16() - big endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 2;
    array[1] = 4;
    var br = new IO.BinaryReader(array, false);
    expect(br.readUInt16()).to.equal(2 * 256 + 4);
  });

  it("readInt16() - little endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 0xFE;
    array[1] = 0xFF;
    var br = new IO.BinaryReader(array);
    expect(br.readInt16()).to.equal(-2);
  });

  it("readInt16() - big endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 0xFF;
    array[1] = 0xFE;
    var br = new IO.BinaryReader(array, false);
    expect(br.readInt16()).to.equal(-2);
  });

  it("readUInt32() - little endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 0; array[2] = 0; array[3] = 0;
    array[1] = 0xFF;
    var br = new IO.BinaryReader(array);
    expect(br.readUInt32()).to.equal(255 * 256);
  });

  it("readUInt32() - big endian", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    array[0] = 0; array[1] = 0; array[3] = 0;
    array[2] = 0xFF;
    var br = new IO.BinaryReader(array, false);
    expect(br.readUInt32()).to.equal(255 * 256);
  });

  it("readUInt64() - little endian", () => {
    let buffer = new ArrayBuffer(8);
    let array = new Uint8Array(buffer);
    array[2] = 0xFF;
    var br = new IO.BinaryReader(array);
    assert(br.readUInt64().eq(new IO.Uint64(0, 0xff0000)));
  });

  it("readUInt64() - big endian", () => {
    let buffer = new ArrayBuffer(8);
    let array = new Uint8Array(buffer);
    array[6] = 0xFF;
    var br = new IO.BinaryReader(array, false);
    assert(br.readUInt64().eq(new IO.Uint64(0, 0xff00)));
  });

  it("readFloat()", () => {
    let buffer = new ArrayBuffer(4);
    let array = new Uint8Array(buffer);
    // 0x40490ff9
    array[0] = 0xf9; array[1] = 0x0f; array[2] = 0x49; array[3] = 0x40;
    var br = new IO.BinaryReader(array);
    expect(br.readFloat()).to.equal(3.1415998935699463);
  });

  it("readDouble()", () => {
    let buffer = new ArrayBuffer(8);
    let array = new Uint8Array(buffer);
    // 0x4000000000000000
    array[7] = 0x40;
    var br = new IO.BinaryReader(array);
    expect(br.readDouble()).to.equal(2.0);
  });

  it("readString()", () => {
    let buffer = new ArrayBuffer(3);
    let array = new Uint8Array(buffer);
    array[0] = "4".charCodeAt(0);
    array[1] = "2".charCodeAt(0);
    var br = new IO.BinaryReader(array);
    expect(br.readString(2)).to.equal("42");
  });


});