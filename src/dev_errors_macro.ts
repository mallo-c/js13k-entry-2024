export default function devError(msg: string) {
    if (process.env.NODE_ENV == "development") return new Function("throw new Error(" + JSON.stringify(msg) + ");");
    else return new Function("document.write('Kernel Panic');")
}