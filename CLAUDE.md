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
```

- `enabled: true` turns the mode on.
- `spawn` controls which object type(s) `Game.ts` actually instantiates (`ObstacleField`/`CollectibleField` are `| null` and skipped entirely when excluded) — e.g. `spawn: gems` gives an undyable run for exhaustively testing gem pickups, `spawn: obstacles` isolates collision/explosion testing without gems in the way.
- `dimGameOver: false` adds a `noDim` class to the `#gameOver` overlay so the scene stays fully lit and inspectable after a collision, instead of being darkened.

Use this whenever manually verifying a change would otherwise mean waiting on luck (surviving to a gem, avoiding/hitting an obstacle on demand, inspecting a frozen post-collision scene). Turn it off (`enabled: false`) before considering a task done — it must never be left on as the shipped default.

If a future testing need doesn't fit this (e.g. isolating a specific obstacle/gem index, freezing world scroll, forcing a specific lane), it's reasonable to extend `testMode` further rather than resorting to ad hoc throwaway edits.
