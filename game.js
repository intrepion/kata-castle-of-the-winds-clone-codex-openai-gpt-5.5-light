"use strict";

const STORAGE_PREFIX = "windglass-save-";
const MAP_WIDTH = 28;
const MAP_HEIGHT = 18;
const SIGHT_RADIUS = 5;

const CLASSES = {
  sentinel: {
    name: "Sentinel",
    summary: "Durable, steady, and forgiving for a first descent.",
    hp: 30,
    mana: 10,
    attack: 6,
    defense: 4,
    gold: 18,
    pack: ["Field Supply", "Mend Draught", "Brass Key"],
    equipment: {
      mainHand: "Iron Longsword",
      offHand: "Town Shield",
      head: "Watch Helm",
      body: "Padded Hauberk",
      ring: "Plain Copper Ring",
      charm: "Glass Saint Token"
    }
  },
  arcanist: {
    name: "Arcanist",
    summary: "Mana-rich and fragile, with better control of danger.",
    hp: 22,
    mana: 22,
    attack: 4,
    defense: 2,
    gold: 22,
    pack: ["Field Supply", "Mend Draught", "Blue Chalk"],
    equipment: {
      mainHand: "Ash Wand",
      offHand: "Ledger Buckler",
      head: "Scholar Hood",
      body: "Threadbare Robe",
      ring: "Clouded Glass Ring",
      charm: "Mnemonic Bead"
    }
  },
  wayfarer: {
    name: "Wayfarer",
    summary: "Mobile and alert, with practical survival instincts.",
    hp: 26,
    mana: 14,
    attack: 5,
    defense: 3,
    gold: 20,
    pack: ["Field Supply", "Mend Draught", "Coil of Line"],
    equipment: {
      mainHand: "Keen Dirk",
      offHand: "Shortbow",
      head: "Weather Cap",
      body: "Travel Jerkin",
      ring: "Lucky Tin Ring",
      charm: "Wind Knot"
    }
  }
};

const EMPTY_EQUIPMENT = {
  mainHand: "Empty",
  offHand: "Empty",
  head: "Empty",
  body: "Empty",
  ring: "Empty",
  charm: "Empty"
};

const state = {
  mode: "town",
  hero: createHero("sentinel"),
  day: 1,
  turn: 0,
  floor: 1,
  dungeon: null,
  log: [],
  journal: [
    "Greyglass Town hired you to recover the Windglass Lens from the sealed fourth floor.",
    "The Keep respects preparation: rest, carry supplies, and save before descending.",
    "Mouse-first rule: adjacent tiles act, distant visible tiles inspect."
  ]
};

const ui = {};

document.addEventListener("DOMContentLoaded", () => {
  bindUi();
  bindActions();
  renderClassChoices();
  addLog("Welcome to Greyglass Town. The Keep is quiet below.");
  render();
});

function bindUi() {
  ui.subtitle = document.querySelector("#subtitle");
  ui.mapTitle = document.querySelector("#map-title");
  ui.turnLabel = document.querySelector("#turn-label");
  ui.townView = document.querySelector("#town-view");
  ui.dungeonView = document.querySelector("#dungeon-view");
  ui.heroPanel = document.querySelector("#hero-panel");
  ui.paperDoll = document.querySelector("#paper-doll");
  ui.packList = document.querySelector("#pack-list");
  ui.packCount = document.querySelector("#pack-count");
  ui.logList = document.querySelector("#log-list");
  ui.newGameDialog = document.querySelector("#new-game-dialog");
  ui.saveDialog = document.querySelector("#save-dialog");
  ui.journalDialog = document.querySelector("#journal-dialog");
  ui.classChoices = document.querySelector("#class-choices");
  ui.saveSlots = document.querySelector("#save-slots");
  ui.journalContent = document.querySelector("#journal-content");
}

function bindActions() {
  document.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-tile-index]");
    if (tile) {
      handleTileClick(Number(tile.dataset.tileIndex));
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "new-game") openNewGameDialog();
    if (action === "save") openSaveDialog("save");
    if (action === "load") openSaveDialog("load");
    if (action === "journal" || action === "help") openJournal();
    if (action === "rest") restInTown();
    if (action === "buy-supply") buySupply();
    if (action === "sell-trinket") sellTrinket();
    if (action === "enter-keep") enterKeep();
    if (action === "choose-class") startNewGame(button.dataset.classId);
    if (action === "save-slot") useSaveSlot(Number(button.dataset.slot), button.dataset.intent);
  });

  document.addEventListener("keydown", (event) => {
    if (state.mode !== "dungeon" || event.target.closest("dialog")) return;
    const movement = {
      ArrowUp: [0, -1],
      KeyW: [0, -1],
      ArrowDown: [0, 1],
      KeyS: [0, 1],
      ArrowLeft: [-1, 0],
      KeyA: [-1, 0],
      ArrowRight: [1, 0],
      KeyD: [1, 0]
    }[event.code];
    if (!movement) return;
    event.preventDefault();
    tryMove(movement[0], movement[1]);
  });
}

function createHero(classId) {
  const template = CLASSES[classId];
  return {
    classId,
    className: template.name,
    hp: template.hp,
    maxHp: template.hp,
    mana: template.mana,
    maxMana: template.mana,
    attack: template.attack,
    defense: template.defense,
    gold: template.gold,
    packLimit: 10,
    pack: [...template.pack],
    equipment: { ...EMPTY_EQUIPMENT, ...template.equipment }
  };
}

function openNewGameDialog() {
  ui.newGameDialog.showModal();
}

function renderClassChoices() {
  ui.classChoices.innerHTML = Object.entries(CLASSES).map(([id, adventurerClass]) => `
    <button type="button" class="class-card" data-action="choose-class" data-class-id="${id}">
      <strong>${adventurerClass.name}</strong>
      <span>${adventurerClass.summary}</span>
      <span class="muted">HP ${adventurerClass.hp} · Mana ${adventurerClass.mana} · Attack ${adventurerClass.attack} · Defense ${adventurerClass.defense}</span>
    </button>
  `).join("");
}

function startNewGame(classId) {
  state.mode = "town";
  state.hero = createHero(classId);
  state.day = 1;
  state.turn = 0;
  state.floor = 1;
  state.dungeon = null;
  state.log = [];
  state.journal = [
    "Greyglass Town hired you to recover the Windglass Lens from the sealed fourth floor.",
    `${state.hero.className} entered the charter under a cold glass moon.`,
    "The Keep respects preparation: rest, carry supplies, and save before descending."
  ];
  ui.newGameDialog.close();
  addLog(`${state.hero.className} signs the Greyglass charter.`);
  render();
}

function restInTown() {
  state.hero.hp = state.hero.maxHp;
  state.hero.mana = state.hero.maxMana;
  state.day += 1;
  addLog(`Restored in Town. DAY ${state.day} begins.`);
  render();
}

function buySupply() {
  if (state.hero.gold < 5) {
    addLog("Not enough gold for another Field Supply.");
    render();
    return;
  }
  if (state.hero.pack.length >= state.hero.packLimit) {
    addLog("The Pack is full. Sell something before buying more.");
    render();
    return;
  }
  state.hero.gold -= 5;
  state.hero.pack.push("Field Supply");
  addLog("Bought Field Supply for 5 gold.");
  render();
}

function sellTrinket() {
  const index = state.hero.pack.findIndex((item) => item !== "Field Supply");
  if (index === -1) {
    addLog("No spare trinket worth selling.");
    render();
    return;
  }
  const [item] = state.hero.pack.splice(index, 1);
  state.hero.gold += 4;
  addLog(`Sold ${item} for 4 gold.`);
  render();
}

function enterKeep() {
  if (!state.dungeon) {
    state.dungeon = createDungeonFloor(state.floor);
    updateVisibility();
  }
  state.mode = "dungeon";
  addLog(`Entered The Keep floor ${state.floor}.`);
  render();
}

function returnToTown() {
  state.mode = "town";
  addLog("Returned to Greyglass Town.");
  render();
}

function openJournal() {
  ui.journalContent.innerHTML = state.journal.map((entry) => `<p>${entry}</p>`).join("");
  ui.journalDialog.showModal();
}

function openSaveDialog(intent) {
  ui.saveSlots.innerHTML = [1, 2, 3].map((slot) => {
    const save = readSave(slot);
    const label = save ? `${save.hero.className} · ${save.mode} · DAY ${save.day} · TURN ${String(save.turn).padStart(3, "0")}` : "Empty";
    const disabled = intent === "load" && !save ? "disabled" : "";
    return `
      <button type="button" class="slot-card" data-action="save-slot" data-slot="${slot}" data-intent="${intent}" ${disabled}>
        <strong>Save Slot ${slot}</strong>
        <span>${label}</span>
      </button>
    `;
  }).join("");
  ui.saveDialog.showModal();
}

function useSaveSlot(slot, intent) {
  if (intent === "save") {
    localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(state));
    addLog(`Saved to Save Slot ${slot}.`);
    ui.saveDialog.close();
    render();
    return;
  }

  const save = readSave(slot);
  if (!save) return;
  Object.assign(state, save);
  addLog(`Loaded Save Slot ${slot}.`);
  ui.saveDialog.close();
  render();
}

function readSave(slot) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function addLog(message) {
  state.log.push(message);
  state.log = state.log.slice(-24);
}

function createDungeonFloor(floor) {
  const tiles = Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, index) => {
    const x = index % MAP_WIDTH;
    const y = Math.floor(index / MAP_WIDTH);
    const wall = x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
    return {
      x,
      y,
      terrain: wall ? "wall" : "floor",
      explored: false,
      visible: false
    };
  });

  carveRoom(tiles, 2, 2, 8, 5);
  carveRoom(tiles, 12, 3, 8, 6);
  carveRoom(tiles, 5, 10, 9, 5);
  carveRoom(tiles, 17, 11, 8, 4);
  carveHall(tiles, 6, 4, 16, 4);
  carveHall(tiles, 16, 4, 16, 13);
  carveHall(tiles, 9, 12, 21, 12);
  carveHall(tiles, 9, 4, 9, 12);

  const player = { x: 4, y: 4 };
  getTile(tiles, player.x, player.y).terrain = "floor";
  getTile(tiles, 23, 13).terrain = "stairs";
  getTile(tiles, 15, 5).terrain = "door";
  getTile(tiles, 8, 12).terrain = "trap";
  getTile(tiles, 20, 12).terrain = "treasure";

  return { floor, player, tiles };
}

function carveRoom(tiles, left, top, width, height) {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      getTile(tiles, x, y).terrain = "floor";
    }
  }
}

function carveHall(tiles, x1, y1, x2, y2) {
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x1;
  let y = y1;
  while (x !== x2 || y !== y2) {
    getTile(tiles, x, y).terrain = "floor";
    if (x !== x2) x += dx;
    if (y !== y2) y += dy;
  }
  getTile(tiles, x2, y2).terrain = "floor";
}

function getTile(tiles, x, y) {
  return tiles[y * MAP_WIDTH + x];
}

function handleTileClick(index) {
  if (state.mode !== "dungeon" || !state.dungeon) return;
  const tile = state.dungeon.tiles[index];
  if (!tile || !tile.visible) {
    addLog("That Tile is beyond your current sight.");
    render();
    return;
  }

  const dx = tile.x - state.dungeon.player.x;
  const dy = tile.y - state.dungeon.player.y;
  if (Math.abs(dx) + Math.abs(dy) === 1) {
    tryMove(dx, dy);
    return;
  }

  addLog(describeTile(tile));
  render();
}

function tryMove(dx, dy) {
  if (!state.dungeon) return;
  const target = getTile(state.dungeon.tiles, state.dungeon.player.x + dx, state.dungeon.player.y + dy);
  if (!target || target.terrain === "wall") {
    addLog("Roll: stone blocks the way.");
    render();
    return;
  }
  if (target.terrain === "door") {
    target.terrain = "floor";
    advanceTurn("Roll: opened a swollen oak door.");
    return;
  }
  state.dungeon.player.x = target.x;
  state.dungeon.player.y = target.y;
  const terrainNote = target.terrain === "stairs" ? " Stairs descend here." : target.terrain === "treasure" ? " Something glints nearby." : target.terrain === "trap" ? " The floor is scratched with old warning marks." : "";
  advanceTurn(`Moved to Tile ${target.x},${target.y}.${terrainNote}`);
}

function advanceTurn(message) {
  state.turn += 1;
  updateVisibility();
  addLog(message);
  render();
}

function updateVisibility() {
  if (!state.dungeon) return;
  for (const tile of state.dungeon.tiles) {
    const distance = Math.abs(tile.x - state.dungeon.player.x) + Math.abs(tile.y - state.dungeon.player.y);
    tile.visible = distance <= SIGHT_RADIUS && hasLineOfSight(tile.x, tile.y);
    if (tile.visible) tile.explored = true;
  }
}

function hasLineOfSight(x, y) {
  const start = state.dungeon.player;
  const steps = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
  if (steps === 0) return true;
  for (let i = 1; i < steps; i += 1) {
    const ix = Math.round(start.x + ((x - start.x) * i) / steps);
    const iy = Math.round(start.y + ((y - start.y) * i) / steps);
    if (getTile(state.dungeon.tiles, ix, iy).terrain === "wall") return false;
  }
  return true;
}

function describeTile(tile) {
  const name = {
    floor: "floor stone",
    wall: "wall",
    door: "closed door",
    stairs: "descending stairs",
    trap: "suspicious floor",
    treasure: "glinting cache"
  }[tile.terrain] || tile.terrain;
  return `Inspected Tile ${tile.x},${tile.y}: ${name}.`;
}

function render() {
  ui.subtitle.textContent = `${state.hero.className} · ${state.mode === "town" ? "Town" : "The Keep"}`;
  ui.mapTitle.textContent = state.mode === "town" ? "Town" : "The Keep";
  ui.turnLabel.textContent = `DAY ${state.day} · TURN ${String(state.turn).padStart(3, "0")}`;
  ui.townView.classList.toggle("hidden", state.mode !== "town");
  ui.dungeonView.classList.toggle("hidden", state.mode !== "dungeon");
  renderHero();
  renderPaperDoll();
  renderPack();
  renderDungeon();
  renderLog();
}

function renderDungeon() {
  if (!state.dungeon) {
    ui.dungeonView.innerHTML = "";
    return;
  }

  ui.dungeonView.innerHTML = state.dungeon.tiles.map((tile, index) => {
    const occupied = tile.x === state.dungeon.player.x && tile.y === state.dungeon.player.y;
    const fog = tile.visible ? "visible" : tile.explored ? "explored" : "unseen";
    const label = occupied ? "Adventurer" : fog === "unseen" ? "Unseen Tile" : describeTile(tile);
    const glyph = occupied ? "@" : tileGlyph(tile, fog);
    return `<button type="button" class="tile ${fog} terrain-${tile.terrain} ${occupied ? "player" : ""}" data-tile-index="${index}" aria-label="${label}">${glyph}</button>`;
  }).join("");
}

function tileGlyph(tile, fog) {
  if (fog === "unseen") return "";
  if (fog === "explored") return "·";
  return {
    floor: "·",
    wall: "■",
    door: "+",
    stairs: ">",
    trap: "!",
    treasure: "$"
  }[tile.terrain] || "?";
}

function renderHero() {
  ui.heroPanel.innerHTML = `
    <div class="stat-line"><span>Class</span><strong>${state.hero.className}</strong></div>
    <div class="stat-line"><span>Health</span><strong>${state.hero.hp}/${state.hero.maxHp}</strong></div>
    <div class="stat-line"><span>Mana</span><strong>${state.hero.mana}/${state.hero.maxMana}</strong></div>
    <div class="stat-line"><span>Attack</span><strong>${state.hero.attack}</strong></div>
    <div class="stat-line"><span>Defense</span><strong>${state.hero.defense}</strong></div>
    <div class="stat-line"><span>Gold</span><strong>${state.hero.gold}</strong></div>
  `;
}

function renderPaperDoll() {
  const labels = {
    mainHand: "Main Hand",
    offHand: "Off Hand",
    head: "Head",
    body: "Body",
    ring: "Ring",
    charm: "Charm"
  };
  ui.paperDoll.innerHTML = Object.entries(labels).map(([slot, label]) => `
    <div class="slot-line"><span>${label}</span><strong>${state.hero.equipment[slot]}</strong></div>
  `).join("");
}

function renderPack() {
  ui.packCount.textContent = `${state.hero.pack.length}/${state.hero.packLimit}`;
  ui.packList.innerHTML = state.hero.pack.length
    ? state.hero.pack.map((item) => `<li>${item}</li>`).join("")
    : "<li>Empty</li>";
}

function renderLog() {
  ui.logList.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join("");
}
