"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var io_1 = require("../src/io");
var BigNum = require("bignumber.js");
describe("Test BinaryReader", function () {
    it("readInt8() - readUInt8()", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 42;
        array[1] = 42;
        var br = new io_1.default(array, false);
        chai_1.expect(br.readInt8()).to.equal(42);
        chai_1.expect(br.readUInt8()).to.equal(42);
    });
    it("readUInt16() - little endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 2;
        array[1] = 4;
        var br = new io_1.default(array);
        chai_1.expect(br.readUInt16()).to.equal(4 * 256 + 2);
    });
    it("readUInt16() - big endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 2;
        array[1] = 4;
        var br = new io_1.default(array, false);
        chai_1.expect(br.readUInt16()).to.equal(2 * 256 + 4);
    });
    it("readInt16() - little endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 0xFE;
        array[1] = 0xFF;
        var br = new io_1.default(array);
        chai_1.expect(br.readInt16()).to.equal(-2);
    });
    it("readInt16() - big endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 0xFF;
        array[1] = 0xFE;
        var br = new io_1.default(array, false);
        chai_1.expect(br.readInt16()).to.equal(-2);
    });
    it("readUInt32() - little endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 0;
        array[2] = 0;
        array[3] = 0;
        array[1] = 0xFF;
        var br = new io_1.default(array);
        chai_1.expect(br.readUInt32()).to.equal(255 * 256);
    });
    it("readUInt32() - big endian", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 0;
        array[1] = 0;
        array[3] = 0;
        array[2] = 0xFF;
        var br = new io_1.default(array, false);
        chai_1.expect(br.readUInt32()).to.equal(255 * 256);
    });
    it("readUInt64() - little endian", function () {
        var buffer = new ArrayBuffer(8);
        var array = new Uint8Array(buffer);
        array[2] = 0xFF;
        var br = new io_1.default(array);
        chai_1.assert(br.readUInt64().eq(new BigNum(0xff0000)));
    });
    it("readUInt64() - big endian", function () {
        var buffer = new ArrayBuffer(8);
        var array = new Uint8Array(buffer);
        array[6] = 0xFF;
        var br = new io_1.default(array, false);
        chai_1.assert(br.readUInt64().eq(new BigNum(0xff00)));
    });
    it("readFloat()", function () {
        var buffer = new ArrayBuffer(4);
        var array = new Uint8Array(buffer);
        array[0] = 0xf9;
        array[1] = 0x0f;
        array[2] = 0x49;
        array[3] = 0x40;
        var br = new io_1.default(array);
        chai_1.expect(br.readFloat()).to.equal(3.1415998935699463);
    });
    it("readDouble()", function () {
        var buffer = new ArrayBuffer(8);
        var array = new Uint8Array(buffer);
        array[7] = 0x40;
        var br = new io_1.default(array);
        chai_1.expect(br.readDouble()).to.equal(2.0);
    });
    it("readString()", function () {
        var buffer = new ArrayBuffer(3);
        var array = new Uint8Array(buffer);
        array[0] = "4".charCodeAt(0);
        array[1] = "2".charCodeAt(0);
        var br = new io_1.default(array);
        chai_1.expect(br.readString(2)).to.equal("42");
    });
});
//# sourceMappingURL=io_test.js.map