import {API} from './run'
import devError from './dev_errors_macro' with {'type': 'macro'};

export type Direction = 0|90|180|270; // Clockwise, 0 deg is Oy
export type Point = {
    x: number,
    y: number
};

function rotateLeft(d: Direction): Direction {
    return ((d + 270) % 360) as Direction;
}

function rotateRight(d: Direction): Direction {
    return ((d + 90) % 360) as Direction;
}

export interface BaseLevel {
    readonly map: boolean[][];
    position: Point & {
        d: Direction
    };
    readonly finish: Point;
}

export class Level implements API, BaseLevel {
    public readonly map: boolean[][];
    public position: Point & {
        d: Direction
    };
    public readonly finish: Point;
    constructor(init: BaseLevel) {
        Object.assign(this, init);
    }
    private _sinCos(d: Direction): [0,-1|1]|[-1|1,0] {
        switch(d) {
            case 0:
                return [0, 1];
            case 90:
                return [1, 0];
            case 180:
                return [0, -1];
            case 270:
                return [-1, 0];
            default:
                devError('Not implemented.')();
        }
    }
    private _isFree(x: number, y: number): boolean {
        return !(!this.map[y] || !this.map[y][x]);
    }
    left(): void {
        this.position.d = rotateLeft(this.position.d);
    }
    right(): void {
        this.position.d = rotateRight(this.position.d);
    }
    run(): void {
        let [sin, cos] = this._sinCos(this.position.d);
        if (!this.scanAhead()) throw new Error("JSK-13 broken");
        this.position.y-=cos;
        this.position.x+=sin;
    }
    private _scan(d: Direction): boolean {
        let [sin, cos] = this._sinCos(d);
        return this._isFree(this.position.x+sin, this.position.y-cos);
    }
    scanLeft(): boolean {
        return this._scan(rotateLeft(this.position.d));
    }
    scanRight(): boolean {
        return this._scan(rotateRight(this.position.d));
    }
    scanAhead(): boolean {
        return this._scan(this.position.d);
    }
    isFinish(): boolean {
        return this.position.x == this.finish.x && this.position.y == this.finish.y;
    }
    static deserialize(l: Uint8Array): LevelWithMetadata {
        let tipEnd = l.indexOf(0);
        if (tipEnd == -1) devError("an invalid data found when deserializing a level: end of tip is not found")();
        let uint8Tip = l.subarray(0, tipEnd);
        let data = l.subarray(tipEnd+1);
        let tip = new TextDecoder().decode(uint8Tip);
        const METADATA_BYTE_SIZE = 8;
        if (data.length < METADATA_BYTE_SIZE) devError("an invalid data found when deserializing a level: level metadata is not found")();
        let h = data[0];
        let w = data[1];
        let p: Point & {
            d: Direction
        } = {
            x: data[2],
            y: data[3],
            d: data[4]*90 as Direction
        }
        let f: Point = {
            x: data[5],
            y: data[6]
        }
        let maxCommands = data[7];
        if (data.length != METADATA_BYTE_SIZE+Math.floor((h*w + (8-h*w%8)%8)/8))
            devError("an invalid data found when deserializing a level: invalid size")();
        let m = [];
        for (let i=0; i<h; ++i) m.push(Array<boolean>(w).fill(false));
        for (let i=METADATA_BYTE_SIZE; i<data.length; ++i) {
            let b = data[i];
            for (let j=0; j<8; ++j) {
                let coord = (i-METADATA_BYTE_SIZE)*8+j;
                if (coord >= h*w) break;
                m[Math.floor(coord/w)][coord%w] = !!(b&(1<<(7-j)));
            }
        }
        return {
            tip,
            maxCommands,
            level: new Level({
                map: m,
                position: p,
                finish: f
            })
        }
    }
}

export interface LevelWithMetadata {
    tip: string,
    maxCommands: number,
    level: Level
}
