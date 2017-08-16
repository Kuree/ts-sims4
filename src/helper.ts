import * as Package from "./package"
import * as CAS from "./cas"
import * as RCOL from "./rcol"

export function find_geom(data: File | Uint8Array) {
  var pack = new Package.Package(data);
  var casp = pack.ResourceEntryList.find(entry => entry.ResourceType == 0x034AEECB);
  if (!casp) {
    return undefined;
  }
  var w = new CAS.CASPWrapper(pack.getResourceStream(casp));
  var lods = w.lodList;

  // only to load the first LOD
  var geomList = Array<Array<RCOL.GEOMRCOLChunk>>(lods.length);
  for (var i = 0; i < geomList.length; i++){
    var lod = lods[i];
    geomList[lod.level] = new Array<RCOL.GEOMRCOLChunk>(lod.lodKey.length);
    for (var j = 0; j < lod.lodKey.length; j++){
      var tgiIndex = lod.lodKey[j];
      if (tgiIndex >= w.tgiList.length) {
        throw Error("Cannot find TGI index " + tgiIndex);
      }
      var tgi = w.tgiList[tgiIndex];
      if (tgi.ResourceType !== 0x015A1849) {
        throw Error("Corrupted CASP file");
      }
      var geomStream = pack.getResourceStream(tgi);
      if (!geomStream) {
        throw new Error("Unable to find required GEOM inside the package file");
      }
      var rcol = new RCOL.RCOLWrapper(geomStream);
      var geom = <RCOL.GEOMRCOLChunk>rcol.rcolChunkList[0];
      geomList[lod.level][j] = geom;
    }
  }

  return geomList;
}