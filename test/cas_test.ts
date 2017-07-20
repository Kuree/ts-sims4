import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as Package from '../src/package'
import * as IO from '../src/io'
import * as CAS from '../src/cas'

describe("Test CAS", () => {
  it("parse CASP", () => {
    var data = fs.readFileSync("test/files/test.package");
    var pkg = new Package.Package(data);
    var tgi = pkg.ResourceEntryList[1];
    expect(tgi.ResourceType).to.equal(0x034AEECB);
    var stream = pkg.getResourceStream(tgi);
    var casp = new CAS.CASPWrapper(stream);
  });
});