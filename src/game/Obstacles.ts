import { Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CROSS_TYPE_MIN_GAP, EDGE_ANGLE_EPSILON, PLAYER_RADIUS, SPAWN_Z, DESPAWN_Z } from "./constants";
import { LaneObjectField } from "./LaneObjectField";
import { settings } from "../settings";

const OBSTACLE_COUNT = 5;
const MIN_GAP = 10;
const MAX_GAP = 22;
export const OBSTACLE_WIDTH = 1.6;
export const OBSTACLE_HEIGHT = 1.6;
export const OBSTACLE_DEPTH = 1.6;

// The gap range shrinks to this fraction of its base size at max speed, so obstacles never
// get so dense they're impossible to react to even as the run's difficulty ramps up.
const MIN_DENSITY_SCALE = 0.4;

const LANE_HIT_THRESHOLD = OBSTACLE_WIDTH / 2 + PLAYER_RADIUS - 0.2;
const Z_HIT_THRESHOLD = OBSTACLE_DEPTH / 2 + PLAYER_RADIUS - 0.2;

export class ObstacleField extends LaneObjectField {
  /**
   * Creates the pool of obstacles, spacing them out ahead of the player, cycling evenly through lanes.
   * @param scene - The Babylon scene to create the obstacle meshes in.
   */
  constructor(scene: Scene) {
    super(SPAWN_Z);
    const color = new Color3(0.75, 0.15, 0.15);
    const material = new StandardMaterial("obstacleMat", scene);
    material.diffuseColor = color;
    material.alpha = settings.wireframe ? settings.opacity : 1;

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const obstacle = MeshBuilder.CreateBox(
        `obstacle${i}`,
        { width: OBSTACLE_WIDTH, height: OBSTACLE_HEIGHT, depth: OBSTACLE_DEPTH },
        scene
      );
      obstacle.material = material;
      // No other obstacles exist yet at this point, so there's nothing to avoid — this just
      // cycles evenly through lanes.
      const spawnPoint = this.claimSpawnPoint([], CROSS_TYPE_MIN_GAP, randomGap(settings.baseSpeed));
      obstacle.position.set(spawnPoint.x, OBSTACLE_HEIGHT / 2, spawnPoint.z);
      if (settings.wireframe) {
        obstacle.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        obstacle.edgesWidth = settings.edgeWidth;
        obstacle.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.items.push(obstacle);
    }
  }

  // Respaces every obstacle ahead of the player for a new run, cycling evenly through lanes.
  reset(): void {
    this.nextSpawnZ = SPAWN_Z;
    this.nextLaneIndex = 0;
    for (const obstacle of this.items) {
      const spawnPoint = this.claimSpawnPoint([], CROSS_TYPE_MIN_GAP, randomGap(settings.baseSpeed));
      obstacle.position.set(spawnPoint.x, OBSTACLE_HEIGHT / 2, spawnPoint.z);
    }
  }

  /**
   * Scrolls obstacles toward the player, recycles passed ones, and reports any collision.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   * @param otherPositions - Current gem/breakable-obstacle positions, avoided when recycling an
   * obstacle to a new lane.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3, otherPositions: Vector3[]): boolean {
    const step = speed * deltaSeconds;
    this.scrollSpawnZ(step);
    let collided = false;
    for (const obstacle of this.items) {
      obstacle.position.z -= step;
      if (obstacle.position.z < DESPAWN_Z) {
        const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap(speed));
        obstacle.position.x = spawnPoint.x;
        obstacle.position.z = spawnPoint.z;
      }
      if (!collided && isObstacleColliding(obstacle.position, playerPosition)) {
        collided = true;
      }
    }
    return collided;
  }
}

/**
 * Checks whether the player overlaps an obstacle-shaped object's lane/z footprint and hasn't
 * jumped over it. Shared with BreakableObstacleField, which uses identical box dimensions and
 * jump-clearance rules.
 * @param obstaclePosition - The object's current world position.
 * @param playerPosition - The player mesh's current world position.
 */
export function isObstacleColliding(obstaclePosition: Vector3, playerPosition: Vector3): boolean {
  const sameLane = Math.abs(obstaclePosition.x - playerPosition.x) < LANE_HIT_THRESHOLD;
  const closeZ = Math.abs(obstaclePosition.z - playerPosition.z) < Z_HIT_THRESHOLD;
  const playerBottom = playerPosition.y - PLAYER_RADIUS;
  const clearedJump = playerBottom > OBSTACLE_HEIGHT;
  return sameLane && closeZ && !clearedJump;
}

/**
 * Picks a random spacing between consecutive obstacles, shrinking as speed increases so
 * obstacles get denser over the course of a run. Also used by BreakableObstacleField so both
 * obstacle types share the same spacing/density feel.
 * @param speed - Current forward speed in units per second, used to scale the gap range down.
 */
export function randomGap(speed: number): number {
  const t = clamp((speed - settings.baseSpeed) / (settings.maxSpeed - settings.baseSpeed), 0, 1);
  const scale = 1 - t * (1 - MIN_DENSITY_SCALE);
  return (MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP)) * scale;
}

/**
 * Restricts a value to the inclusive [min, max] range.
 * @param value - The number to clamp.
 * @param min - The lowest allowed value.
 * @param max - The highest allowed value.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
