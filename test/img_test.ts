import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as IO from '../src/io'
import * as IMG from '../src/img'

describe("Test RLES Wrapper", () => {
  var stream = fs.readFileSync("test/files/ymShoes_AnkleWork_Brown.rle2");
  it("Parse RLES", () => {
    var rles = new IMG.RLEWrapper(stream);

  });
});