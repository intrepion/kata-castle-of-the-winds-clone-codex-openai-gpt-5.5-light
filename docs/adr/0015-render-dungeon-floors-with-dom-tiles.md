# Render Dungeon Floors with DOM Tiles

Dungeon Floors will render as DOM Tiles rather than Canvas. The game is a desktop RPG shell with hover, inspect, click targeting, panes, and accessible state, so DOM Tiles keep the interaction model inspectable and integrated with the rest of the UI.

**Considered Options**

- DOM Tiles.
- Canvas rendering.

**Consequences**

Tile count and styling must stay modest enough for responsive DOM updates. The payoff is simpler hit testing, hover state, labels, and browser automation.
