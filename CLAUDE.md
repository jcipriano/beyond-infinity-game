# Project conventions

- Every function/method (including constructors) must have a comment above it describing what it does. This applies to all existing code and all new functions written going forward.
- If the function takes parameters, document each one with a `@param` line (JSDoc style: `/** ... */` with `@param name - description`). Functions with no parameters keep a plain one-line `//` comment.

## Test mode

`settings.yml` has a `testMode` block for debugging, since the game's normal randomness/pace makes it slow and unreliable to manually reproduce a specific scenario (e.g. catching a short-lived effect, or a collision at a predictable time):

```yaml
testMode:
  enabled: false
  spawn: both # "gems" | "obstacles" | "both"
  dimGameOver: true
  collideWithObstacles: true
```

- `enabled: true` turns the mode on.
- `spawn` controls which object type(s) `Game.ts` actually instantiates (`ObstacleField`/`CollectibleField` are `| null` and skipped entirely when excluded) — e.g. `spawn: gems` gives an undyable run for exhaustively testing gem pickups, `spawn: obstacles` isolates collision/explosion testing without gems in the way.
- `dimGameOver: false` adds a `noDim` class to the `#gameOver` overlay so the scene stays fully lit and inspectable after a collision, instead of being darkened.
- `collideWithObstacles: false` lets the player fly through obstacles without ending the run, so things like obstacle spacing/density over a long run can be observed visually instead of ending after the first hit.

Use this whenever manually verifying a change would otherwise mean waiting on luck (surviving to a gem, avoiding/hitting an obstacle on demand, inspecting a frozen post-collision scene). Turn it off (`enabled: false`) before considering a task done — it must never be left on as the shipped default.

If a future testing need doesn't fit this (e.g. isolating a specific obstacle/gem index, freezing world scroll, forcing a specific lane), it's reasonable to extend `testMode` further rather than resorting to ad hoc throwaway edits.

## Query string setting overrides

Any `settings.yml` value can be overridden per page load via the query string, without editing the file — e.g. `?baseSpeed=40&testMode.enabled=true&testMode.spawn=obstacles`. Nested fields (like everything under `testMode`) use dot notation. This is handled in `src/settings.ts`, which coerces each raw string value to match the corresponding default's type (boolean/number/string) — there's no separate schema to keep in sync.

Prefer this over editing `settings.yml` for one-off/temporary testing (e.g. a single verification run at a specific speed), since it doesn't touch a tracked file. Still use `settings.yml` itself for defaults that should persist.

## Testing on an iPad/iPhone

The dev server (`.claude/launch.json`'s `dev` config) runs `vite --host` so it's reachable from other devices on the same network, not just localhost. To test on an iPad/iPhone:

1. Start/restart the `dev` preview server (stop it first if already running without `--host`).
2. Read its logs (`preview_logs`) for the printed `Network:` URL (e.g. `http://192.168.x.x:5173/`).
3. Have the device join the same Wi-Fi network and open that URL in Safari.

If it doesn't connect: macOS may need to allow incoming connections for `node` (System Settings prompt or Firewall settings), or the router may have client/AP isolation enabled.
