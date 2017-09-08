import { expect, assert } from 'chai';
import 'mocha'
import * as IO from '../src/io'

describe("Test BinaryReader", () => {
  it("readInt8() - little endian", () => {
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

  it("read7BitLength()", () => {
    let buffer = new ArrayBuffer(3);
    let array = new Uint8Array(buffer);
    array[0] = 0x8C;
    array[1] = 0x02;
    var br = new IO.BinaryReader(array);
    expect(br.read7BitLength()).to.equal(0x10C);
  });


});

describe("Test BinaryWriter", () => {
  it("writeInt8() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeUInt8(42);
    expect(bw.getBuffer()[0]).to.equal(42);
    expect(bw.length()).to.equal(1);
  });

  it("writeUInt16() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeUInt16(0x4243);
    expect(bw.getBuffer()[0]).to.equal(0x43);
    expect(bw.getBuffer()[1]).to.equal(0x42);
    expect(bw.length()).to.equal(2);
  });

  it("writeUInt16() - big endian", () => {
    var bw = new IO.BinaryWriter(4, false);
    bw.writeUInt16(0x4243);
    expect(bw.getBuffer()[1]).to.equal(0x43);
    expect(bw.getBuffer()[0]).to.equal(0x42);
    expect(bw.length()).to.equal(2);
  });

  it("writeUInt32() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeUInt32(0x42434445);
    expect(bw.getBuffer()[0]).to.equal(0x45);
    expect(bw.getBuffer()[1]).to.equal(0x44);
    expect(bw.getBuffer()[2]).to.equal(0x43);
    expect(bw.getBuffer()[3]).to.equal(0x42);
    expect(bw.length()).to.equal(4);
  });

  it("writeUInt32() - big endian", () => {
    var bw = new IO.BinaryWriter(4, false);
    bw.writeUInt32(0x42434445);
    expect(bw.getBuffer()[3]).to.equal(0x45);
    expect(bw.getBuffer()[2]).to.equal(0x44);
    expect(bw.getBuffer()[1]).to.equal(0x43);
    expect(bw.getBuffer()[0]).to.equal(0x42);
    expect(bw.length()).to.equal(4);
  });

  it("writeInt8() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeInt8(-2);
    expect(bw.getBuffer()[0]).to.equal(0xFE);
    expect(bw.length()).to.equal(1);
  });

  it("writeInt16() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeInt16(-2);
    expect(bw.getBuffer()[0]).to.equal(0xFE);
    expect(bw.getBuffer()[1]).to.equal(0xFF);
    expect(bw.length()).to.equal(2);
  });

  it("writeInt32() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeInt32(-2);
    expect(bw.getBuffer()[3]).to.equal(0xFF);
    expect(bw.getBuffer()[2]).to.equal(0xFF);
    expect(bw.getBuffer()[1]).to.equal(0xFF);
    expect(bw.getBuffer()[0]).to.equal(0xFE);
    expect(bw.length()).to.equal(4);
  });

  it("writeUInt64() - little endian", () => {
    var bw = new IO.BinaryWriter(4);
    bw.writeUInt64(new IO.Uint64(0x42434445, 0x46474849));
    expect(bw.getBuffer()[0]).to.equal(0x49);
    expect(bw.getBuffer()[1]).to.equal(0x48);
    expect(bw.getBuffer()[2]).to.equal(0x47);
    expect(bw.getBuffer()[3]).to.equal(0x46);
    expect(bw.getBuffer()[4]).to.equal(0x45);
    expect(bw.getBuffer()[5]).to.equal(0x44);
    expect(bw.getBuffer()[6]).to.equal(0x43);
    expect(bw.getBuffer()[7]).to.equal(0x42);
    expect(bw.length()).to.equal(8);
  });

  it("Test overflow", () => {
    var bw = new IO.BinaryWriter(2);
    bw.writeInt32(42);
    bw.writeInt32(42);
    bw.writeInt32(42);
    bw.writeInt16(42);
    bw.seek(2);
    bw.writeInt16(42);
    expect(bw.length()).to.equal(14);
    var buffer = bw.getBuffer();
    expect(buffer[0]).to.equal(42);
    expect(buffer[1]).to.equal(0);
    expect(buffer[2]).to.equal(42);
    expect(buffer[3]).to.equal(0);
    expect(buffer[4]).to.equal(42);
    expect(buffer[8]).to.equal(42);
    expect(buffer[12]).to.equal(42);
  });

});