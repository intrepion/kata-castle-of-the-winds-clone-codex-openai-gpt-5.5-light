# Make dungeon actions mouse-addressable

Dungeon interaction will be mouse-first: clicking adjacent tiles moves, attacks, or opens; clicking distant visible tiles inspects; keyboard arrows or WASD act as shortcuts. The browser game should feel like a desktop RPG, not a keyboard-only terminal roguelike.

**Consequences**

Tile state must be visually legible under the cursor, and core actions need clear hit targets. Keyboard support is still required, but it is not the primary interaction contract.
