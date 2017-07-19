"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IO = require("./io");
var Package = (function () {
    function Package(file) {
        this.HEADER_SIZE = 96;
        this.FOURCC = "DBPF";
        var header_blob = this.slice(file, 0, this.HEADER_SIZE);
        var entryCount = this.readHeader(header_blob);
        // read TGI blocks
    }
    Package.prototype.slice = function (buffer, pos, size) {
        if (buffer instanceof Uint8Array) {
            return buffer.subarray(pos, pos + size);
        }
        else {
            return buffer.slice(pos, pos + size);
        }
    };
    Package.prototype.readHeader = function (data) {
        var data_size = (data instanceof Blob) ? data.size : data.length;
        if (data_size != this.HEADER_SIZE) {
            throw new TypeError("Wrong header size. Get " + data_size + " expected " + this.HEADER_SIZE);
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
    };
    return Package;
}());
exports.default = Package;
var TGIResourceBlock = (function () {
    function TGIResourceBlock() {
    }
    return TGIResourceBlock;
}());
exports.TGIResourceBlock = TGIResourceBlock;
