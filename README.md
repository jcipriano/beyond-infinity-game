# Beyond Infinity

A TypeScript + Babylon.js game scaffold: a sphere you drive around a ground plane, collecting glowing gems for score, viewed through an orbiting camera.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. Controls: `WASD` / arrow keys to move, mouse drag to orbit the camera, scroll to zoom.

## Structure

- [src/main.ts](src/main.ts) — entry point, boots the `Game`.
- [src/game/Game.ts](src/game/Game.ts) — engine/scene setup and the render loop.
- [src/game/Player.ts](src/game/Player.ts) — player mesh, camera, and keyboard movement.
- [src/game/Environment.ts](src/game/Environment.ts) — ground plane and world dressing.
- [src/game/Collectibles.ts](src/game/Collectibles.ts) — gem spawning, pickup detection, and score.

## Build

```bash
npm run build
npm run preview
```
