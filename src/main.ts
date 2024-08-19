import {Level, LevelWithMetadata} from "./level";
import { parse, run, tokenize } from "./run";
import { standardLevels } from "./standard_levels";
import showModal from './modal';
import { arePointsMatch, delay, Box, nop } from "./utils";

// @ts-ignore because typescript cannot handle Parcel's bundle-text
import intro from 'bundle-text:./docs/intro.txt';
// @ts-ignore because typescript cannot handle Parcel's bundle-text
import next from 'bundle-text:./docs/next.txt';

let codeEditor = document.getElementById("code")! as HTMLTextAreaElement;
let field = document.getElementById("field")!;
let currentLevelDisplay = document.getElementById("level")!;
let buttons = {
    run: document.getElementById("runButton")! as HTMLButtonElement,
    help: document.getElementById("helpButton")! as HTMLButtonElement,
    story: document.getElementById("storyButton")! as HTMLButtonElement,
    stop: document.getElementById("stopButton")! as HTMLButtonElement,

    speed: document.getElementById("speedButton")! as HTMLButtonElement
}
buttons.speed.innerText = "SPEED: slow"
buttons.stop.disabled = true;
buttons.stop.addEventListener("click", ()=>{
    programStopped.$ = true;
})
buttons.help.addEventListener("click", ()=>showModal(currentLevel.$!.tip, {"OK": nop}));
buttons.story.addEventListener("click", ()=>showModal(intro, {"OK": nop}));
buttons.run.addEventListener("click", ()=>startCode());
buttons.speed.addEventListener("click", ()=>{
    if (fast.$) buttons.speed.innerText = "SPEED: slow";
    else buttons.speed.innerText = "SPEED: fast";
    fast.$ = !fast.$;
})

let currentLevel = new Box<(LevelWithMetadata & { id: number; }) | null>(null);
let programStopped = new Box(false);
let fast = new Box(false);

async function startCode() {
    buttons.run.disabled = true;
    buttons.stop.disabled = false;
    let errorPrefix: string = "";
    try {
        errorPrefix = "JSK-13 does not understand you: ";
        let tok = tokenize(codeEditor.value);
        let p = parse(tok);
        let count = 0;
        for (let token of tok) {
            if (Array.of('left', 'right', 'run').indexOf(token.token) != -1) count++;
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
        if (standardLevels[currentLevel.$!.id+1] != undefined && currentLevel.$!.id+1 != 13)
            await showModal("<p>Congratulations, you have reached the flag! Proceed to the next level?</p>", {"Go": nop});
        await startLevel(currentLevel.$!.id+1);
    } catch(e) {
        await showModal(errorPrefix + (e as Error).message, {"OK": nop});
        resetLevel();
        buttons.stop.disabled = true;
        buttons.run.disabled = false;
    }
}

function resetLevel() {
    let id = currentLevel.$!.id;
    let lev = Level.deserialize(standardLevels[id]);
    currentLevel.$ = {id, ...lev}
    drawLevel();
    patchLevel();
}

function patchLevel() {
    let lev = currentLevel.$!.level;
    // Patch the Level to add auto-redraw and stop
    // @ts-ignore
    lev.beforeStep = async () => await delay(fast.$? 30 : 300);
    // @ts-ignore
    lev.afterStep = () => {
        drawLevel();
        if (programStopped.$) {
            programStopped.$ = false;
            throw new Error("Program interrupted");
        }
    }
}

async function startLevel(id: number) {
    codeEditor.value = "";
    currentLevelDisplay.innerText = "";
    field.innerText = "";
    if (standardLevels[id] === undefined) {
        await showModal(next, {});
        return;
    }
    let lev = Level.deserialize(Uint8Array.from(standardLevels[id]));
    currentLevel.$ = {id, ...lev}
    if (id + 1 == 13) {
        let phobia = await showModal("Do you have triskadekaphobia?", {"Yes": ()=>true, "No": ()=>false});
        if (phobia) currentLevelDisplay.innerText = "Level 12A";
        else currentLevelDisplay.innerText = "Level 13";
    } else {
        currentLevelDisplay.innerText = "Level " + (id+1);
    }
    localStorage.setItem("thirteens_everywhere__level", id.toString());
    await showModal(lev.tip, {"OK": nop});
    drawLevel();
    patchLevel();
}

const Pictures = {
    Wall: new URL("assets/wall.png", import.meta.url),
    Empty: new URL("assets/empty.png", import.meta.url),
    Flag: new URL("assets/flag.png", import.meta.url),
    Player0: new URL("assets/player0.png", import.meta.url)
}

function drawLevel() {
    // Cleanup the field
    field.innerText = "";

    let level = currentLevel.$!.level;
    field.style.gridTemplateRows = `repeat(${level.map.length}, 1fr)`;
    field.style.gridTemplateColumns = `repeat(${level.map[0].length}, 1fr)`;
    for (let i=0; i<level.map.length; ++i) {
        for (let j=0; j<level.map[0].length; ++j) {
            let cellCoords = {x: j, y: i};
            let element = document.createElement("img");
            if (arePointsMatch(cellCoords, level.position)) {
                element.src = Pictures.Player0.toString();
                element.style.transform = `rotate(${level.position.d}deg)`;
            } else if (arePointsMatch(cellCoords, level.finish))
                element.src = Pictures.Flag.toString();
            else
                element.src = (level.map[i][j]? Pictures.Empty : Pictures.Wall).toString();
            field.append(element);
        }
    }
}

document.body.onload = ()=>{
    (async function() {
        if (!localStorage.getItem("thirteens_everywhere__level")) await showModal(intro, {"OK": nop});
        await startLevel(parseInt(localStorage.getItem("thirteens_everywhere__level") ?? "0"));
    })()
}
