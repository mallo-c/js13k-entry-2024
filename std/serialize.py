#!/usr/bin/env python3
from functools import reduce
from itertools import batched, chain, cycle, islice
from pathlib import Path
from sys import argv
import struct
file = argv[1]
outfile = file + ".bin"
level = Path(file).read_text()
text_tip, *example, maze, solution = level.split("\n\n")

tip_lines = text_tip.split("\n")
tip = f"<h1>{tip_lines[0]}</h1>" + ''.join(f"<p>{i}</p>" for i in tip_lines[1:])

if example:
    tip += f"<pre><code>{example[0].strip()}</code></pre>"

start = None
finish = None

maze = maze.strip().split("\n")

for line, row in enumerate(maze):
    start_up_idx = row.find("^")
    start_right_idx = row.find(">")
    start_left_idx = row.find("<")
    start_down_idx = row.find(",")
    if start_up_idx != -1:
        start = {
            "x": start_up_idx,
            "y": line,
            "d": 0
        }
    elif start_right_idx != -1:
        start = {
            "x": start_right_idx,
            "y": line,
            "d": 1
        }
    elif start_left_idx != -1:
        start = {
            "x": start_left_idx,
            "y": line,
            "d": 3
        }
    elif start_down_idx != -1:
        start = {
            "x": start_down_idx,
            "y": line,
            "d": 2
        }
    finish_idx = row.find("F")
    if finish_idx != -1:
        finish = {
            "x": finish_idx,
            "y": line
        }
array_maze = [[int(i != "#") for i in row] for row in maze]
h = len(array_maze)
w = len(array_maze[0])
commands = 0
for command in ("left", "right", "run", "scanAhead", "scanLeft", "scanRight"):
    commands += solution.count(command)
tip += f"<p>Warning: try not to use more than {commands} commands!</p>"
flat_maze = reduce(lambda x, y: x+y, array_maze)
chunks = [i for i in batched(flat_maze, 8)]
if len(chunks[-1]) != 8:
    chunks[-1] = tuple(islice(chain(chunks[-1], cycle([0])), 8))
bytes_chunks = bytes(
    sum(
        c << (7-i) for i, c in enumerate(chunk)
    )
    for chunk in chunks
)
with Path(outfile).open("wb") as f:
    f.write(tip.encode())
    f.write(b'\0')
    f.write(struct.pack("BBBBBBBB",
                        h, w,
                        start["x"], start["y"], start["d"],
                        finish["x"], finish["y"],
                        commands))
    f.write(bytes_chunks)