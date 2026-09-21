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
export const JUMP_SPEED = 11;
export const LANE_LERP_SPEED = 12;
export const ROLL_VISUAL_DAMPING = 0.35;

export const SPAWN_Z = 60;
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

// Minimum z distance required between an obstacle and a gem sharing a lane, so their meshes never overlap.
export const CROSS_TYPE_MIN_GAP = 3;

/**
 * Picks a lane x position at the given z that isn't already occupied (within minGap) by another
 * lane-based object, so obstacles and gems never spawn overlapping each other.
 * @param z - The z position the new object will spawn at.
 * @param others - Positions of the other object type's currently active instances.
 * @param minGap - Minimum z separation required to consider a lane clear at this z.
 */
export function pickClearLaneX(z: number, others: Vector3[], minGap: number): number {
  const clearLanes = LANE_X_POSITIONS.filter((x) =>
    others.every((other) => Math.abs(other.x - x) > 0.01 || Math.abs(other.z - z) >= minGap)
  );
  const candidates = clearLanes.length > 0 ? clearLanes : LANE_X_POSITIONS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
