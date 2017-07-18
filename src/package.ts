class Package{
  private _file: File | Uint8Array;
  private _fileSize: number;

	readonly Major: number;
	readonly Unknown1: Int8Array;
	readonly Unknown2: number;
	IndexSize: number;
	readonly Unknown3: Int8Array;
	readonly IndexVersion: number;
	IndexPosition: number;
	readonly Unknown4: Int8Array;

	private readonly HEADER_SIZE = 96;

	constructor(file: File | Uint8Array) {
		
  }


	readHeader(blob: Blob) {
		if (blob.size != this.HEADER_SIZE) {
			throw new TypeError("Wrong header size. Get " + blob.size + " expected " + this.HEADER_SIZE)
		}
	}
}