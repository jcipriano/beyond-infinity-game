export const LANE_COUNT = 3;
export const LANE_WIDTH = 3;
export const LANE_X_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const GROUND_Y = 0;
export const PLAYER_RADIUS = 0.7;

export const GRAVITY = -30;
export const JUMP_SPEED = 11;
export const LANE_LERP_SPEED = 12;
export const ROLL_VISUAL_DAMPING = 0.35;

export const BASE_SPEED = 12;
export const MAX_SPEED = 28;
export const SPEED_RAMP = 0.15;

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
