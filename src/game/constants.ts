import { Vector3 } from "@babylonjs/core";

export const LANE_COUNT = 3;
export const LANE_WIDTH = 3;
export const LANE_X_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

// The x position of every lane boundary, including the outer edges of the leftmost/rightmost lanes,
// so all lanes are striped to the same width. Used to draw lane dividers.
export const LANE_BOUNDARIES = Array.from(
  { length: LANE_COUNT + 1 },
  (_, i) => LANE_X_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH
);

export const GROUND_Y = 0;
export const PLAYER_RADIUS = 0.7;

export const GRAVITY = -30;
export const JUMP_SPEED = 12.5;
export const LANE_LERP_SPEED = 12;
export const ROLL_VISUAL_DAMPING = 0.35;

export const SPAWN_Z = 100;
export const DESPAWN_Z = -6;

// Edge-detection angle threshold (as a dot product of adjacent face normals) for enableEdgesRendering.
// Very close to 1 so even the shallow angles between a low-poly sphere's triangles count as edges,
// reproducing a full wireframe grid instead of only the sharpest creases.
export const EDGE_ANGLE_EPSILON = 0.9999;

// Transparent meshes are sorted by alphaIndex before distance, so giving the ground a lower value
// than the (default Number.MAX_VALUE) obstacles/gems/player guarantees it always renders first,
// instead of competing on a per-tile distance estimate that's a poor proxy for a 40-unit-long plane.
export const GROUND_ALPHA_INDEX = 0;

// Picks a random lane's x position, used to place obstacles and gems.
export function randomLaneX(): number {
  const index = Math.floor(Math.random() * LANE_X_POSITIONS.length);
  return LANE_X_POSITIONS[index];
}

// Minimum z distance required between two lane-based objects sharing a lane, so their meshes
// never overlap, regardless of which of the three object types (obstacle/gem/breakable
// obstacle) each one is.
export const CROSS_TYPE_MIN_GAP = 3;

/**
 * Picks a lane x position and z position — starting at the given z, and only pushed further out
 * if every lane is blocked there — that isn't already occupied (within minGap) by another
 * lane-based object. With three independent object pools all sharing three lanes, a lane being
 * blocked at the exact requested z is no longer rare enough to just fall back to a random lane
 * (as a two-pool system could get away with); nudging the spawn point out by minGap and
 * rechecking guarantees a genuinely clear placement instead.
 *
 * Lanes are tried in rotation starting from preferredLaneIndex, rather than picked randomly
 * among whichever are clear — a pool that always calls this with the previous result's
 * laneIndex + 1 cycles evenly through all three lanes over time instead of clumping into
 * whichever one chance favors, which otherwise becomes pronounced with small pool sizes.
 * @param z - The z position the new object would ideally spawn at.
 * @param others - Positions of the other object types' currently active instances.
 * @param minGap - Minimum z separation required to consider a lane clear at a given z.
 * @param preferredLaneIndex - Index into LANE_X_POSITIONS to try first, then rotate through the rest.
 */
export function pickClearSpawnPoint(
  z: number,
  others: Vector3[],
  minGap: number,
  preferredLaneIndex: number
): { x: number; z: number; laneIndex: number } {
  let candidateZ = z;
  // Bounded by more than the total number of other objects, since in the worst case (all of
  // them crammed into one lane near candidateZ) that's how many steps it could take to clear
  // the last one — comfortably safe given this game's object counts.
  const maxAttempts = others.length + LANE_X_POSITIONS.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (let i = 0; i < LANE_X_POSITIONS.length; i++) {
      const laneIndex = (preferredLaneIndex + i) % LANE_X_POSITIONS.length;
      const x = LANE_X_POSITIONS[laneIndex];
      const isClear = others.every(
        (other) => Math.abs(other.x - x) > 0.01 || Math.abs(other.z - candidateZ) >= minGap
      );
      if (isClear) return { x, z: candidateZ, laneIndex };
    }
    candidateZ += minGap;
  }
  return { x: randomLaneX(), z: candidateZ, laneIndex: preferredLaneIndex };
}
