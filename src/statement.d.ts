export type Any = Move | If | Loop;
export type Block = Any[];
export type Move = {type: "move"; action: "left" | "right" | "run"};
export type If = {
  type: "if";
  cond: "scanLeft" | "scanRight" | "scanAhead";
  body: Block;
  else: Block | null;
};
export type Loop = {type: "loop"; body: Block};
