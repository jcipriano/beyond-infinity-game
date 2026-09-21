# Beyond Infinity

An endless-runner built with TypeScript and Babylon.js: a rolling sphere races down a
three-lane track, jumping over obstacles and collecting gems as the speed ramps up over time.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL.

**Controls:** `A`/`D` or `←`/`→` to change lanes, `Space`/`W`/`↑` to jump. On touch devices,
swipe left/right to change lanes and swipe up to jump.

## Gameplay

- Gems (+100) and breakable obstacles (−50) award or dock score on contact, shown as a
  floating popup at the point of impact.
- Solid obstacles end the run on collision unless cleared with a jump.
- Forward speed ramps up continuously over the course of a run.

## Structure

- [src/main.ts](src/main.ts) — entry point, boots the `Game`.
- [src/game/Game.ts](src/game/Game.ts) — engine/scene setup, state machine, and the render loop.
- [src/game/Player.ts](src/game/Player.ts) — player mesh, lane switching, and jump physics.
- [src/game/ChaseCamera.ts](src/game/ChaseCamera.ts) — third-person camera that follows the player.
- [src/game/Track.ts](src/game/Track.ts) / [src/game/StarField.ts](src/game/StarField.ts) — scrolling track and background starfield.
- [src/game/Obstacles.ts](src/game/Obstacles.ts) / [src/game/BreakableObstacles.ts](src/game/BreakableObstacles.ts) — solid and breakable lane hazards.
- [src/game/Collectibles.ts](src/game/Collectibles.ts) — gem spawning and pickup detection.
- [src/game/ScorePopups.ts](src/game/ScorePopups.ts) — floating score-change text at each pickup/hit.
- [src/game/Explosion.ts](src/game/Explosion.ts) — shattering particle effect for breaks/collisions.
- [src/game/IntroScreen.ts](src/game/IntroScreen.ts) / [src/game/GameOverScreen.ts](src/game/GameOverScreen.ts) — start and game-over overlays.
- [src/game/SoundManager.ts](src/game/SoundManager.ts) — music and sound effects.
- [src/settings.ts](src/settings.ts) — loads [settings.yml](settings.yml), with per-load overrides via query string (e.g. `?baseSpeed=40&testMode.enabled=true`).

## Configuration

Gameplay tuning (speed, sound volumes, wireframe rendering, and a `testMode` for deterministic
manual testing) lives in [settings.yml](settings.yml) — see the comments in that file for details.

## Build

```bash
npm run build
npm run preview
```
