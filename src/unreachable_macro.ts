// This macro is used to mark some place as unreachable.
// In a debugging environment, this resolves into code that throws an exception.
// In a production environment, to reduce code size, this resolves only to 0(), causing the browser to throw an exception.

// Because Rust rules
export default function unreachable /* ! */(msg: string): () => never {
    if (process.env.NODE_ENV == "development")
        return new Function("throw new Error(" + JSON.stringify(msg) + ");") as () => never;
    // @ts-expect-error because 0 is not callable.
    else return 0;
}
