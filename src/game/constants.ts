export const LANE_COUNT = 3;
export const LANE_WIDTH = 3;
export const LANE_X_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const GROUND_Y = 0;
export const PLAYER_RADIUS = 0.7;

export const GRAVITY = -30;
export const JUMP_SPEED = 11;
export const LANE_LERP_SPEED = 12;

export const BASE_SPEED = 12;
export const MAX_SPEED = 28;
export const SPEED_RAMP = 0.15;

export const SPAWN_Z = 60;
export const DESPAWN_Z = -6;

// Picks a random lane's x position, used to place obstacles and gems.
export function randomLaneX(): number {
  const index = Math.floor(Math.random() * LANE_X_POSITIONS.length);
  return LANE_X_POSITIONS[index];
}
