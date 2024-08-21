// Because Rust rules
export default function unreachable /* ! */(msg: string): () => never {
    if (process.env.NODE_ENV == "development")
        return new Function("throw new Error(" + JSON.stringify(msg) + ");") as () => never;
    // @ts-expect-error because 0 is not callable.
    else return 0;
}
