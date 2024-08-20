// Because Rust rules
export default function unreachable/* ! */(msg: string): Function {
    if (process.env.NODE_ENV == "development")
        return new Function("throw new Error(" + JSON.stringify(msg) + ");");
    else
        // @ts-expect-error because 0 is not callable.
        return 0;
}