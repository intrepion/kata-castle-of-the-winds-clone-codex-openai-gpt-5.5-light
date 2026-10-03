# Use three-state fog of war

Fog of war will distinguish Unseen, Explored, and Visible Tiles. Keeping explored space visible supports route planning and the careful dungeon-crawler feel while preserving uncertainty outside the Adventurer's current sight.

**Consequences**

The renderer and save data must preserve explored Tiles separately from currently visible Tiles. Inspection and targeting should treat Explored and Visible Tiles differently.
