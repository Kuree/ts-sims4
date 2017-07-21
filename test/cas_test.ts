import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as Package from '../src/package'
import * as IO from '../src/io'
import * as CAS from '../src/cas'

describe("Test CAS", () => {
  var stream = fs.readFileSync("test/files/ymShoes_AnkleWork_Brown.caspart");
  var casp = new CAS.CASPWrapper(stream);

  it("name", () => {
    var name = casp.name;
    // escape unicode
    name = name.replace(/\u0000/g, "");
    expect(name).to.equal("ymShoes_AnkleWork_Brown");
  });

  it("specular map key", () => {
    var key = casp.specularMapKey;
    expect(key).to.equal(8);
  });

  it("property ID", () => {
    var id = casp.propertyID;
    expect(id).to.equal(0x1DAE);
  });

  it("sort priority", () => {
    var sort = casp.sortPriority;
    expect(sort).to.equal(5);
  });

  it("TGI list", () => {
    var tgi = <Package.TGIBlock>casp.tgiList[1];
    var type = 0x015A1849;
    var group = 0x00E8506E;
    var instance = new IO.Uint64(0x91F13B83, 0x2B1BB9BA);
    var expected = new Package.TGIBlock(type, group, instance);
    assert(tgi.eq(expected), tgi.ResourceInstance.toString());
  });
});