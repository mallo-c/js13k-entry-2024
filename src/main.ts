import {Level, LevelWithMetadata} from "./level";
import {parse, run, tokenize} from "./run";
import {standardLevels} from "./standard_levels";
import showModal from "./modal";
import {arePointsMatch, delay, Box} from "./utils";

import intro from "bundle-text:./docs/intro.txt";
import next from "bundle-text:./docs/next.txt";

const codeEditor = document.getElementById("code")! as HTMLTextAreaElement;
const field = document.getElementById("field")!;
const currentLevelDisplay = document.getElementById("level")!;
const buttons = {
  run: document.getElementById("runButton")! as HTMLButtonElement,
  help: document.getElementById("helpButton")! as HTMLButtonElement,
  story: document.getElementById("storyButton")! as HTMLButtonElement,
  stop: document.getElementById("stopButton")! as HTMLButtonElement,

  speed: document.getElementById("speedButton")! as HTMLButtonElement
};
buttons.speed.innerText = "SPEED: slow";
buttons.stop.disabled = true;
buttons.stop.addEventListener("click", () => {
  programStopped.$ = true;
});
buttons.help.addEventListener("click", () => showModal(currentLevel.$!.tip, {OK: () => void 0}));
buttons.story.addEventListener("click", () => showModal(intro, {OK: () => void 0}));
buttons.run.addEventListener("click", () => startCode());
buttons.speed.addEventListener("click", () => {
  if (fast.$) buttons.speed.innerText = "SPEED: slow";
  else buttons.speed.innerText = "SPEED: fast";
  fast.$ = !fast.$;
});

const currentLevel = new Box<(LevelWithMetadata & {id: number}) | null>(null);
const programStopped = new Box(false);
const fast = new Box(false);

async function startCode() {
  buttons.run.disabled = true;
  buttons.stop.disabled = false;
  let errorPrefix: string = "";
  try {
    errorPrefix = "JSK-13 does not understand you: ";
    const tok = tokenize(codeEditor.value);
    const p = parse(tok);
    let count = 0;
    for (const token of tok) {
      if (Array.of("left", "right", "run").indexOf(token.token) != -1) count++;
    }
    errorPrefix = "Pre-check failed: ";
    if (count == 0) throw new Error("your program doesn't do anything");
    errorPrefix = "Runtime error: ";
    await run(p, currentLevel.$!.level);
    errorPrefix = "Post-check failed: ";
    if (!currentLevel.$!.level.isFinish()) throw new Error("You have not reached the finish");
    if (count > currentLevel.$!.maxCommands) throw new Error("You have used too many commands, try again");
    buttons.stop.disabled = true;
    buttons.run.disabled = false;
    await delay(500);
    if (standardLevels[currentLevel.$!.id + 1] != undefined && currentLevel.$!.id + 1 != 13)
      await showModal("<p>Congratulations, you have reached the flag! Proceed to the next level?</p>", {
        Go: () => void 0
      });
    await startLevel(currentLevel.$!.id + 1);
  } catch (e) {
    await showModal(errorPrefix + (e as Error).message, {OK: () => void 0});
    resetLevel();
    buttons.stop.disabled = true;
    buttons.run.disabled = false;
  }
}

function resetLevel() {
  const id = currentLevel.$!.id;
  const lev = Level.deserialize(standardLevels[id]);
  currentLevel.$ = {id, ...lev};
  drawLevel();
  patchLevel();
}

function patchLevel() {
  const lev = currentLevel.$!.level;
  // Patch the Level to add auto-redraw and stop
  // @ts-expect-error patching the level
  lev.beforeStep = async () => await delay(fast.$ ? 30 : 300);
  // @ts-expect-error patching the level
  lev.afterStep = () => {
    drawLevel();
    if (programStopped.$) {
      programStopped.$ = false;
      throw new Error("Program interrupted");
    }
  };
}

async function startLevel(id: number) {
  codeEditor.value = "";
  currentLevelDisplay.innerText = "";
  field.innerText = "";
  if (standardLevels[id] === undefined) {
    await showModal(next, {});
    return;
  }
  const lev = Level.deserialize(Uint8Array.from(standardLevels[id]));
  currentLevel.$ = {id, ...lev};
  if (id + 1 == 13) {
    const phobia = await showModal("Do you have triskadekaphobia?", {
      Yes: () => true,
      No: () => false
    });
    if (phobia) currentLevelDisplay.innerText = "Level 12A";
    else currentLevelDisplay.innerText = "Level 13";
  } else {
    currentLevelDisplay.innerText = "Level " + (id + 1);
  }
  localStorage.setItem("thirteens_everywhere__level", id.toString());
  await showModal(lev.tip, {OK: () => void 0});
  drawLevel();
  patchLevel();
}

const Pictures = {
  Wall: new URL("assets/wall.png", import.meta.url),
  Empty: new URL("assets/empty.png", import.meta.url),
  Flag: new URL("assets/flag.png", import.meta.url),
  Player0: new URL("assets/player0.png", import.meta.url)
};

function drawLevel() {
  // Cleanup the field
  field.innerText = "";

  const level = currentLevel.$!.level;
  field.style.gridTemplateRows = `repeat(${level.map.length}, 1fr)`;
  field.style.gridTemplateColumns = `repeat(${level.map[0].length}, 1fr)`;
  for (let i = 0; i < level.map.length; ++i) {
    for (let j = 0; j < level.map[0].length; ++j) {
      const cellCoords = {x: j, y: i};
      const element = document.createElement("img");
      if (arePointsMatch(cellCoords, level.position)) {
        element.src = Pictures.Player0.toString();
        element.style.transform = `rotate(${level.position.d}deg)`;
      } else if (arePointsMatch(cellCoords, level.finish)) element.src = Pictures.Flag.toString();
      else element.src = (level.map[i][j] ? Pictures.Empty : Pictures.Wall).toString();
      field.append(element);
    }
  }
}

document.body.onload = () => {
  (async function () {
    if (!localStorage.getItem("thirteens_everywhere__level")) await showModal(intro, {OK: () => void 0});
    await startLevel(parseInt(localStorage.getItem("thirteens_everywhere__level") ?? "0"));
  })();
};
