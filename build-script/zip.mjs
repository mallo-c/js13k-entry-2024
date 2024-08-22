import archiver from "archiver";
import { createWriteStream } from "fs";
let arc = archiver("zip", {
    zlib: {level: 9}
});
const output = createWriteStream("dist.zip");
arc.pipe(output);
arc.directory("dist/", "");
arc.finalize();
