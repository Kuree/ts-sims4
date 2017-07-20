import { expect, assert } from 'chai';
import 'mocha'
import * as fs from 'fs'
import * as Package from '../src/package'
import * as IO from '../src/io'
import * as RCOL from '../src/rcol'

describe("Test RCOL load", () => {
  it("get default RCOL chunk", () => {
    var chunk = RCOL.getRCOLChunk(-1, null);
    assert(chunk != undefined);
  });
});