const archiver = require("archiver");
const fs = require("fs");
let arc = archiver("zip", {
    zlib: {level: 9}
});
const output = fs.createWriteStream("dist.zip");
arc.pipe(output);
arc.directory("dist/", "");
arc.finalize();
