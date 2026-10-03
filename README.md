# Windglass Keep

Windglass Keep is an original, offline-friendly browser dungeon crawler inspired by the interaction grammar of Castle of the Winds: a mouse-first desktop RPG shell, turn-based dungeon exploration, visible combat math, loot, spells, a safe Town hub, and browser-local Save Slots.

The implementation target is deliberately small and static: `index.html`, `styles.css`, and `game.js` should be enough to play the game directly or through a tiny local server.

## Design Contract

- Build as a dependency-free static browser game.
- Preserve a retro desktop RPG shell: menu bar, tile map, panes, Log, Journal, Pack, Paper Doll, and Save Slot dialogs.
- Make dungeon actions mouse-addressable, with keyboard movement shortcuts.
- Use DOM-rendered dungeon Tiles rather than Canvas.
- Use `28x18` Tile Dungeon Floors.
- Track fog of war as Unseen, Explored, and Visible.
- Present Town as a command hub, not a walkable Tile map.
- Ship the first dungeon arc as four floors ending with recovery of the Windglass Lens.
- Use restrained generated loot names: base item plus one Modifier.
- Ship MVP 1 silently; audio is out of scope for the first playable version.
- Design desktop and laptop viewports first, with a usable tablet-width fallback.

## MVP 1 Scope

- Start a new Adventurer as Sentinel, Arcanist, or Wayfarer.
- Use a thin but functional Town: Rest, buy and sell basic Supplies, manage Save Slots, enter The Keep, and read the Journal.
- Explore four generated Dungeon Floors with rooms, corridors, doors, traps, monsters, treasure, stairs, and fog of war.
- Resolve Encounters against Guard, Hunter, Skulker, and Hexer monster behaviors.
- Cast six Spells: Spark, Mend, Ward, Reveal, Blink, and Glassbind.
- Manage a slot-based Pack and a six-slot Paper Doll: Main Hand, Off Hand, head, body, ring, and Charm.
- Record important Rolls and outcomes in the Log.
- Save and continue through three browser-local Save Slots.
- Recover the Windglass Lens from the sealed fourth floor and return to Town to win.

## Controls

- Click an adjacent Dungeon Tile to move, attack, or open.
- Click a distant Visible Tile to inspect it.
- Use arrow keys or WASD for movement shortcuts.
- Use desktop-style buttons, menus, and dialogs for Town, Pack, Paper Doll, Journal, and Save Slot actions.

## Local Launch

When the static files exist, open `index.html` directly in a browser or serve the folder:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/`.

## Verification Contract

MVP completion requires browser evidence, not just syntax checks:

1. Load the page.
2. Start as Sentinel.
3. Enter Town.
4. Enter The Keep.
5. Advance at least one dungeon Turn.
6. Fight or inspect an Encounter.
7. Save to a Save Slot.
8. Reload and continue the saved game.
9. Confirm the browser console has no application errors.

After verification passes, the playable MVP should be committed and pushed in one implementation commit, followed by local and remote SHA alignment checks.
