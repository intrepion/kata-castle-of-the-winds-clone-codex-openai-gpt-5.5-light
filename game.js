"use strict";

const STORAGE_PREFIX = "windglass-save-";

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
  state.mode = "dungeon";
  addLog("The first gate is still being surveyed. Dungeon MVP unlocks next.");
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

function render() {
  ui.subtitle.textContent = `${state.hero.className} · ${state.mode === "town" ? "Town" : "The Keep"}`;
  ui.mapTitle.textContent = state.mode === "town" ? "Town" : "The Keep";
  ui.turnLabel.textContent = `DAY ${state.day} · TURN ${String(state.turn).padStart(3, "0")}`;
  ui.townView.classList.toggle("hidden", state.mode !== "town");
  ui.dungeonView.classList.toggle("hidden", state.mode !== "dungeon");
  renderHero();
  renderPaperDoll();
  renderPack();
  renderLog();
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
