import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as Package from '../src/package'
import * as IO from '../src/io'

describe("Test Package", () => {
  it("open package", () => {
    var data = fs.readFileSync("test/files/test.package");
    var pkg = new Package.Package(data);
    expect(pkg.Major).to.equal(2);
    expect(pkg.Minor).to.equal(1);
    expect(pkg.ResourceEntryList.length).to.equal(2);
    expect(pkg.ResourceEntryList[0].ResourceType).to.equal(0x0333406C);
    assert(pkg.ResourceEntryList[0].ResourceInstance.eq(new IO.Uint64(0, 31415926)));
    expect(pkg.ResourceEntryList[1].ResourceType).to.equal(0x034AEECB);
  });

  it("read entry data", () => {
    var data = fs.readFileSync("test/files/test.package");
    var pkg = new Package.Package(data);
    var tgi = new Package.TGIBlock(0x0333406C, 0x42, new IO.Uint64(0, 31415926))
    var entry = pkg.getResourceEntry(tgi);
    assert(entry !== undefined);
    var stream = pkg.getResourceStream(entry);
    assert(stream !== undefined);
    var br = new IO.BinaryReader(stream);
    expect(br.readString(5)).to.equal("Lorem");
  });
});

