import type {MacroContext} from '@parcel/macros';
import * as fs from 'node:fs'
import * as ch from 'node:child_process'

export function stdLevel(this: MacroContext | void, id: string) {
    if (this) {
        this.invalidateOnFileChange(`std/${id}.lvl`);
        this.invalidateOnFileChange(`std/serialize.py`);
    }
    ch.execSync(`python3 std/serialize.py std/${id}.lvl`);
    let buf = fs.readFileSync(`std/${id}.lvl.bin`);
    fs.unlinkSync(`std/${id}.lvl.bin`)
    let hex = buf.toString('hex');
    return new Function(`let hex = "${hex}";
        let bytes = [];
        for (let c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.slice(c, c+2), 16));
        return Uint8Array.from(bytes);`
    );
}