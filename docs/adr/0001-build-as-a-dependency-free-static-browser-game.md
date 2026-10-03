# Build as a dependency-free static browser game

Windglass Keep will be implemented as a self-contained static browser game rather than a bundled Vite or framework app. The core artifact should be understandable and playable from plain `index.html`, `styles.css`, and `game.js`, preserving direct local launch and keeping verification focused on the real browser interaction path instead of build tooling.

**Considered Options**

- Dependency-free static files.
- Vite or TypeScript for stronger structure and test tooling.
- A heavier canvas or WebGL framework.

**Consequences**

The implementation must stay disciplined about module boundaries inside plain JavaScript, and browser verification matters more than toolchain checks. The upside is an offline-friendly shareware feel that matches the game being built.
