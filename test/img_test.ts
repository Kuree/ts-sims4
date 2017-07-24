import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as IO from '../src/io'
import * as IMG from '../src/img'

describe("Test RLE2 Wrapper", () => {
  var stream = fs.readFileSync("test/files/ymShoes_AnkleWork_Brown.rle2");
  it("Parse RLE2", () => {
    var rle2 = new IMG.RLEWrapper(stream);
    var s = rle2.toDDS();
  });
});