"use strict";

const STORAGE_PREFIX = "windglass-save-";
const MAP_WIDTH = 28;
const MAP_HEIGHT = 18;
const SIGHT_RADIUS = 5;

const SPELLS = {
  spark: { name: "Spark", cost: 3, summary: "Damage a visible monster." },
  mend: { name: "Mend", cost: 4, summary: "Restore health." },
  ward: { name: "Ward", cost: 3, summary: "Raise defense briefly." },
  reveal: { name: "Reveal", cost: 2, summary: "Expose more nearby Tiles." },
  blink: { name: "Blink", cost: 3, summary: "Retreat to the entry." },
  glassbind: { name: "Glassbind", cost: 4, summary: "Root a visible monster." }
};

const MONSTER_TYPES = {
  guard: { name: "Gate Guard", behavior: "Guard", glyph: "G", hp: 10, attack: 4, defense: 2 },
  hunter: { name: "Hollow Hunter", behavior: "Hunter", glyph: "H", hp: 8, attack: 5, defense: 1 },
  skulker: { name: "Mirror Skulker", behavior: "Skulker", glyph: "S", hp: 7, attack: 4, defense: 1 },
  hexer: { name: "Glass Hexer", behavior: "Hexer", glyph: "X", hp: 6, attack: 3, defense: 1 }
};

const LOOT_BASES = ["Dirk", "Buckler", "Ring", "Charm", "Helm", "Hauberk"];
const LOOT_MODIFIERS = ["Keen", "Patient", "Windglass", "Foxed", "Blue", "Steady"];

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
  activeSpell: null,
  wardTurns: 0,
  hasLens: false,
  won: false,
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
  ui.spellList = document.querySelector("#spell-list");
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
    if (action === "select-spell") selectSpell(button.dataset.spellId);
    if (action === "use-supply") useSupply();
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
  state.activeSpell = null;
  state.wardTurns = 0;
  state.hasLens = false;
  state.won = false;
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
  if (state.won) {
    addLog("The Windglass Lens is safe. Greyglass Town can breathe again.");
    render();
    return;
  }
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
  state.dungeon = null;
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
  getTile(tiles, 23, 13).terrain = floor === 4 ? "lens" : "stairs";
  getTile(tiles, 15, 5).terrain = "door";
  getTile(tiles, 8, 12).terrain = "trap";
  getTile(tiles, 20, 12).terrain = "treasure";

  const depthBonus = floor - 1;
  return {
    floor,
    player,
    tiles,
    monsters: [
      createMonster("guard", 15, 6, depthBonus),
      createMonster("hunter", 21, 12, depthBonus),
      createMonster("skulker", 7, 13, depthBonus),
      createMonster("hexer", 18, 4, depthBonus)
    ]
  };
}

function createMonster(type, x, y, depthBonus = 0) {
  const template = MONSTER_TYPES[type];
  return {
    id: `${type}-${x}-${y}`,
    type,
    name: template.name,
    behavior: template.behavior,
    glyph: template.glyph,
    x,
    y,
    hp: template.hp + depthBonus * 2,
    maxHp: template.hp + depthBonus * 2,
    attack: template.attack + depthBonus,
    defense: template.defense,
    rooted: 0
  };
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
    const monster = monsterAt(tile.x, tile.y);
    if (monster) {
      attackMonster(monster);
      return;
    }
    tryMove(dx, dy);
    return;
  }

  if (state.activeSpell) {
    castSpellAt(tile);
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
  const monster = monsterAt(target.x, target.y);
  if (monster) {
    attackMonster(monster);
    return;
  }
  if (target.terrain === "door") {
    target.terrain = "floor";
    advanceTurn("Roll: opened a swollen oak door.");
    return;
  }
  state.dungeon.player.x = target.x;
  state.dungeon.player.y = target.y;
  if (target.terrain === "trap") {
    const damage = Math.max(1, 5 - state.hero.defense);
    state.hero.hp = Math.max(0, state.hero.hp - damage);
    target.terrain = "floor";
    advanceTurn(`Roll: trap springs for ${damage} damage.`);
    checkDefeat();
    return;
  }
  if (target.terrain === "treasure") {
    collectTreasure(target);
    return;
  }
  if (target.terrain === "stairs") {
    descendStairs();
    return;
  }
  if (target.terrain === "lens") {
    recoverLens(target);
    return;
  }
  const terrainNote = "";
  advanceTurn(`Moved to Tile ${target.x},${target.y}.${terrainNote}`);
}

function advanceTurn(message) {
  state.turn += 1;
  if (state.wardTurns > 0) state.wardTurns -= 1;
  for (const monster of state.dungeon.monsters) {
    if (monster.rooted > 0) monster.rooted -= 1;
  }
  moveMonsters();
  updateVisibility();
  addLog(message);
  render();
}

function attackMonster(monster) {
  const roll = rollD6() + state.hero.attack;
  const defense = 7 + monster.defense;
  let defeated = false;
  if (roll >= defense) {
    const damage = Math.max(1, state.hero.attack + rollD3() - monster.defense);
    monster.hp -= damage;
    addLog(`Roll ${roll} vs ${defense}: hit ${monster.name} for ${damage}.`);
    if (monster.hp <= 0) {
      defeatMonster(monster);
      defeated = true;
    }
  } else {
    addLog(`Roll ${roll} vs ${defense}: missed ${monster.name}.`);
  }
  advanceTurn(defeated ? `${monster.name} collapses into bright grit.` : `${monster.name} answers the noise.`);
}

function defeatMonster(monster) {
  state.dungeon.monsters = state.dungeon.monsters.filter((candidate) => candidate.id !== monster.id);
  state.hero.gold += 3;
  addLog(`${monster.name} falls. Found 3 gold.`);
}

function moveMonsters() {
  for (const monster of [...state.dungeon.monsters]) {
    const distance = Math.abs(monster.x - state.dungeon.player.x) + Math.abs(monster.y - state.dungeon.player.y);
    if (distance === 1) {
      monsterAttack(monster);
      continue;
    }
    if (monster.rooted > 0) continue;
    if (monster.behavior === "Guard" && distance > 4) continue;
    if (monster.behavior === "Skulker" && state.turn % 2 === 0) continue;
    const step = stepToward(monster.x, monster.y, state.dungeon.player.x, state.dungeon.player.y);
    if (!step) continue;
    const occupied = monsterAt(step.x, step.y);
    const terrain = getTile(state.dungeon.tiles, step.x, step.y).terrain;
    if (!occupied && terrain !== "wall" && terrain !== "door") {
      monster.x = step.x;
      monster.y = step.y;
    }
  }
}

function monsterAttack(monster) {
  const roll = rollD6() + monster.attack;
  const defense = 8 + state.hero.defense + (state.wardTurns > 0 ? 3 : 0);
  if (roll >= defense) {
    const damage = Math.max(1, monster.attack + rollD3() - state.hero.defense);
    state.hero.hp = Math.max(0, state.hero.hp - damage);
    addLog(`Roll ${roll} vs ${defense}: ${monster.name} hits for ${damage}.`);
    checkDefeat();
  } else {
    addLog(`Roll ${roll} vs ${defense}: ${monster.name} misses.`);
  }
}

function stepToward(x, y, tx, ty) {
  const options = [
    { x: x + Math.sign(tx - x), y },
    { x, y: y + Math.sign(ty - y) }
  ].filter((step) => step.x !== x || step.y !== y);
  return options[0] || null;
}

function monsterAt(x, y) {
  return state.dungeon?.monsters.find((monster) => monster.x === x && monster.y === y && monster.hp > 0) || null;
}

function selectSpell(spellId) {
  if (!SPELLS[spellId]) return;
  if (state.activeSpell === spellId) {
    state.activeSpell = null;
    addLog("Lowered spell hand.");
  } else {
    state.activeSpell = spellId;
    addLog(`${SPELLS[spellId].name} readied.`);
  }
  render();
}

function castSpellAt(tile) {
  const spell = SPELLS[state.activeSpell];
  if (!spell) return;
  if (state.hero.mana < spell.cost) {
    addLog(`Not enough mana for ${spell.name}.`);
    state.activeSpell = null;
    render();
    return;
  }

  const monster = monsterAt(tile.x, tile.y);
  if (state.activeSpell === "spark") {
    if (!monster) {
      addLog("Spark needs a visible monster.");
    } else {
      state.hero.mana -= spell.cost;
      const damage = 6 + rollD3();
      monster.hp -= damage;
      addLog(`Roll: Spark burns ${monster.name} for ${damage}.`);
      if (monster.hp <= 0) defeatMonster(monster);
      advanceTurn("The air smells of hot glass.");
    }
  } else if (state.activeSpell === "glassbind") {
    if (!monster) {
      addLog("Glassbind needs a visible monster.");
    } else {
      state.hero.mana -= spell.cost;
      monster.rooted = 3;
      advanceTurn(`Roll: ${monster.name} is bound in glass for 3 turns.`);
    }
  }
  state.activeSpell = null;
  render();
}

function castSelfSpell(spellId) {
  const spell = SPELLS[spellId];
  if (state.hero.mana < spell.cost) {
    addLog(`Not enough mana for ${spell.name}.`);
    render();
    return;
  }
  state.hero.mana -= spell.cost;
  if (spellId === "mend") {
    const amount = 8 + rollD3();
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + amount);
    advanceTurn(`Roll: Mend restores ${amount} health.`);
  }
  if (spellId === "ward") {
    state.wardTurns = 6;
    advanceTurn("Roll: Ward raises your defense for 6 turns.");
  }
  if (spellId === "reveal") {
    for (const tile of state.dungeon.tiles) {
      const distance = Math.abs(tile.x - state.dungeon.player.x) + Math.abs(tile.y - state.dungeon.player.y);
      if (distance <= 8) tile.explored = true;
    }
    advanceTurn("Roll: Reveal sketches nearby halls into memory.");
  }
  if (spellId === "blink") {
    state.dungeon.player = { x: 4, y: 4 };
    advanceTurn("Roll: Blink snaps you back to the entry stones.");
  }
}

function collectTreasure(tile) {
  const item = `${LOOT_MODIFIERS[(state.turn + tile.x) % LOOT_MODIFIERS.length]} ${LOOT_BASES[(state.turn + tile.y) % LOOT_BASES.length]}`;
  tile.terrain = "floor";
  if (state.hero.pack.length >= state.hero.packLimit) {
    addLog(`Found ${item}, but the Pack is full.`);
  } else {
    state.hero.pack.push(item);
    addLog(`Found ${item}.`);
  }
  advanceTurn("The cache is empty now.");
}

function descendStairs() {
  if (state.floor >= 4) return;
  state.floor += 1;
  state.dungeon = createDungeonFloor(state.floor);
  state.activeSpell = null;
  updateVisibility();
  state.turn += 1;
  addLog(`Descended to The Keep floor ${state.floor}.`);
  render();
}

function recoverLens(tile) {
  tile.terrain = "floor";
  state.hasLens = true;
  state.won = true;
  state.mode = "town";
  state.dungeon = null;
  state.journal.push("The Windglass Lens returned to Town, bright enough to still the old aqueduct winds.");
  addLog("Recovered the Windglass Lens and returned to Greyglass Town. Victory.");
  render();
}

function checkDefeat() {
  if (state.hero.hp > 0) return;
  addLog("The Adventurer falls. Reload a Save Slot to continue.");
  setTimeout(() => openSaveDialog("load"), 0);
}

function useSupply() {
  const index = state.hero.pack.indexOf("Field Supply");
  if (index === -1) {
    addLog("No Field Supply remains.");
    render();
    return;
  }
  state.hero.pack.splice(index, 1);
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 6);
  addLog("Used Field Supply for 6 health.");
  render();
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollD3() {
  return Math.floor(Math.random() * 3) + 1;
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
    treasure: "glinting cache",
    lens: "Windglass Lens"
  }[tile.terrain] || tile.terrain;
  const monster = monsterAt(tile.x, tile.y);
  if (monster) return `Inspected Tile ${tile.x},${tile.y}: ${monster.name} (${monster.behavior}) ${monster.hp}/${monster.maxHp} HP.`;
  return `Inspected Tile ${tile.x},${tile.y}: ${name}.`;
}

function render() {
  ui.subtitle.textContent = `${state.hero.className} · ${state.mode === "town" ? "Town" : "The Keep"}`;
  ui.mapTitle.textContent = state.mode === "town" ? "Town" : `The Keep · Floor ${state.floor}`;
  ui.turnLabel.textContent = `DAY ${state.day} · TURN ${String(state.turn).padStart(3, "0")}`;
  ui.townView.classList.toggle("hidden", state.mode !== "town");
  ui.dungeonView.classList.toggle("hidden", state.mode !== "dungeon");
  renderHero();
  renderPaperDoll();
  renderPack();
  renderSpells();
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
    const monster = monsterAt(tile.x, tile.y);
    const fog = tile.visible ? "visible" : tile.explored ? "explored" : "unseen";
    const label = occupied ? "Adventurer" : fog === "unseen" ? "Unseen Tile" : describeTile(tile);
    const glyph = occupied ? "@" : monster && fog === "visible" ? monster.glyph : tileGlyph(tile, fog);
    return `<button type="button" class="tile ${fog} terrain-${tile.terrain} ${occupied ? "player" : ""} ${monster && fog === "visible" ? "monster" : ""}" data-tile-index="${index}" aria-label="${label}">${glyph}</button>`;
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
    treasure: "$",
    lens: "*"
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
    ? state.hero.pack.map((item) => `<li>${item}${item === "Field Supply" ? ' <button type="button" data-action="use-supply">Use</button>' : ""}</li>`).join("")
    : "<li>Empty</li>";
}

function renderSpells() {
  ui.spellList.innerHTML = Object.entries(SPELLS).map(([spellId, spell]) => {
    const disabled = state.mode !== "dungeon" || state.hero.mana < spell.cost ? "disabled" : "";
    const active = state.activeSpell === spellId ? " active" : "";
    const action = ["mend", "ward", "reveal", "blink"].includes(spellId) ? `onclick="castSelfSpell('${spellId}')"` : `data-action="select-spell" data-spell-id="${spellId}"`;
    return `<button type="button" class="spell-button${active}" ${action} ${disabled}><strong>${spell.name}</strong><span>${spell.cost} mana · ${spell.summary}</span></button>`;
  }).join("");
}

function renderLog() {
  ui.logList.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join("");
}
