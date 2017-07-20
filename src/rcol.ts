import * as IO from './io'
import * as Package from './package'


export class RCOLChunk{
  protected _data: Uint8Array | Blob;

  constructor(data: Uint8Array | Blob) {
    this._data = data;
  }
}

export class GEOMRCOLChunk extends RCOLChunk{
  constructor(data: Uint8Array | Blob) {

    super(data);
  }
}

export class RCOLWrapper extends Package.ResourceWrapper{
  version: number;
  
  protected parse(data: Uint8Array | Blob) {
    
  }
}




const RCOLRegister = {
  0: RCOLChunk
}


export function getRCOLChunk(type: number, data: Uint8Array | Blob) {
  var chunk = RCOLRegister[type];
  if (chunk) {
    var result = new chunk(chunk, data);
    return <RCOLChunk>result;
  } else {
    return new RCOLChunk(data);
  }
}

