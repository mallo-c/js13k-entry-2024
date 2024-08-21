import unreachable from "./unreachable_macro";
import * as Stmt from "./statement";

export interface Token {
    start: number;
    end: number;
    token: string;
    line: number;
}

export interface API {
    left(): void | Promise<void>;
    right(): void | Promise<void>;
    run(): void | Promise<void>;
    scanLeft(): boolean | Promise<boolean>;
    scanRight(): boolean | Promise<boolean>;
    scanAhead(): boolean | Promise<boolean>;
    isFinish(): boolean | Promise<boolean>;
    beforeStep?(): void | Promise<void>;
    afterStep?(): void | Promise<void>;
}

export interface ParseError extends Error {
    unexpected: string;
    line: number;
}

export function parseError(unexpected: string, line: number): ParseError {
    const obj: ParseError = Error(`unexpected ${unexpected} at line ${line}`) as ParseError;
    obj.unexpected = unexpected;
    obj.line = line;
    return obj;
}

export function tokenize(code: string): Token[] {
    const token = /^((\w+)\b|\W)/;
    const spaces = /^\s*/;
    const tokens: Token[] = [];
    let start = 0;
    let line = 1;
    while (code) {
        const sp = code.match(spaces)!;
        start += sp[0].length;
        line += sp[0].split("\n").length - 1;
        code = code.substring(sp[0].length);
        if (!code) break;
        const m = code.match(token);
        if (m === null) throw parseError(code[0], line);
        tokens.push({
            start,
            end: start + m[0].length,
            token: m[0],
            line
        });
        code = code.substring(m[0].length);
        start += m[0].length;
    }
    return tokens;
}
export function parse(tokens: Token[]): Stmt.Block {
    const parsed: Stmt.Block[] = [[]];
    const stack: string[] = [];
    const ifs: Stmt.If[] = [];
    const scans: ("scanLeft" | "scanRight" | "scanAhead")[] = [];
    for (const {token, line} of tokens) {
        switch (token) {
            case "left":
            case "right":
            case "run":
                if (!stack[stack.length - 1] || stack[stack.length - 1] == "{") {
                    parsed[parsed.length - 1].push({
                        type: "move",
                        action: token
                    });
                } else throw parseError(token, line);
                break;
            case "scanAhead":
            case "scanLeft":
            case "scanRight":
                if (stack[stack.length - 1] == "if_expr") {
                    stack.pop();
                    stack.push("if_block");
                    scans.push(token);
                } else throw parseError(token, line);
                break;
            case "loop":
                if (!stack[stack.length - 1] || stack[stack.length - 1] == "{") {
                    stack.push("loop_block");
                } else throw parseError(token, line);
                break;
            case "if":
                if (!stack[stack.length - 1] || stack[stack.length - 1] == "{") {
                    stack.push("if_expr");
                } else throw parseError(token, line);
                break;
            case "else": {
                // because of no-case-declarations
                const lastParsedBlock = parsed[parsed.length - 1];
                const lastParsed = lastParsedBlock[lastParsedBlock.length - 1];
                if (
                    !stack[stack.length - 1] ||
                    (stack[stack.length - 1] == "{" && lastParsed && lastParsed.type == "if" && lastParsed.else == null)
                ) {
                    stack.push("else_block");
                } else throw parseError(token, line);
                break;
            }
            case "{":
                if (stack[stack.length - 1] == "if_block") {
                    parsed.push([]);
                    stack.pop();
                    stack.push("if_body");
                    stack.push("{");
                } else if (stack[stack.length - 1] == "else_block") {
                    const ifBlock = parsed[parsed.length - 1];
                    const ifOp = ifBlock[ifBlock.length - 1];
                    if (ifOp.type != "if") unreachable(`last parsed must be 'if'`)();
                    parsed.push([]);
                    stack.pop();
                    ifs.push(ifOp as Stmt.If);
                    stack.push("else_body");
                    stack.push("{");
                } else if (stack[stack.length - 1] == "loop_block") {
                    parsed.push([]);
                    stack.pop();
                    stack.push("loop_body");
                    stack.push("{");
                } else throw parseError(token, line);
                break;
            case "}":
                if (stack[stack.length - 1] == "{") {
                    stack.pop();
                    if (stack[stack.length - 1] == "if_body") {
                        stack.pop();
                        parsed[parsed.length - 2].push({
                            type: "if",
                            cond: scans.pop(),
                            body: parsed.pop(),
                            else: null
                        });
                    } else if (stack[stack.length - 1] == "else_body") {
                        stack.pop();
                        const ifOp = ifs.pop();
                        ifOp.else = parsed.pop();
                    } else if (stack[stack.length - 1] == "loop_body") {
                        stack.pop();
                        parsed[parsed.length - 2].push({
                            type: "loop",
                            body: parsed.pop()
                        });
                    }
                } else throw parseError(token, line);
                break;
            default:
                throw parseError(token, line); // tokenizer found an invalid word
        }
    }
    if (stack.length > 0) throw new Error("unexpected EOF");
    return parsed.flat();
}

export async function run(code: Stmt.Block, api: API): Promise<void> {
    for (const cmd of code) {
        if (api.beforeStep) await api.beforeStep();
        if (cmd.type == "if") {
            if (await api[cmd.cond]()) await run(cmd.body, api);
            else if (cmd.else !== null) await run(cmd.else, api);
        } else if (cmd.type == "move") {
            switch (cmd.action) {
                case "left":
                    await api.left();
                    break;
                case "right":
                    await api.right();
                    break;
                case "run":
                    await api.run();
                    break;
            }
        } else if (cmd.type == "loop") {
            while (!api.isFinish()) await run(cmd.body, api);
        }
        if (api.afterStep) await api.afterStep();
    }
}
