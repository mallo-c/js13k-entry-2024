import {Point} from "./level";

export async function delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

export function arePointsMatch(c1: Point, c2: Point): boolean {
    return c1.x == c2.x && c1.y == c2.y;
}

export class Box<T> {
    /** Value contained in the box */
    public $: T;
    constructor(initial: T) {
        this.$ = initial;
    }
}
