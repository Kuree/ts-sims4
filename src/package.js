var Package = (function () {
    function Package(file) {
        this.HEADER_SIZE = 96;
    }
    Package.prototype.readHeader = function (blob) {
        if (blob.size != this.HEADER_SIZE) {
            throw new TypeError("Wrong header size. Get " + blob.size + " expected " + this.HEADER_SIZE);
        }
    };
    return Package;
}());
//# sourceMappingURL=package.js.map