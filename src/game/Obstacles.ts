import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import {
  CROSS_TYPE_MIN_GAP,
  DESPAWN_Z,
  EDGE_ANGLE_EPSILON,
  PLAYER_RADIUS,
  SPAWN_Z,
  pickClearLaneX,
  randomLaneX,
} from "./constants";
import { settings } from "../settings";

const OBSTACLE_COUNT = 8;
const MIN_GAP = 10;
const MAX_GAP = 22;
const OBSTACLE_WIDTH = 1.6;
const OBSTACLE_HEIGHT = 1.6;
const OBSTACLE_DEPTH = 1.6;

// The gap range shrinks to this fraction of its base size at max speed, so obstacles never
// get so dense they're impossible to react to even as the run's difficulty ramps up.
const MIN_DENSITY_SCALE = 0.4;

const LANE_HIT_THRESHOLD = OBSTACLE_WIDTH / 2 + PLAYER_RADIUS - 0.2;
const Z_HIT_THRESHOLD = OBSTACLE_DEPTH / 2 + PLAYER_RADIUS - 0.2;

export class ObstacleField {
  private readonly obstacles: Mesh[] = [];
  private nextSpawnZ = SPAWN_Z;

  /**
   * Creates the pool of obstacles, spacing them out ahead of the player in random lanes.
   * @param scene - The Babylon scene to create the obstacle meshes in.
   */
  constructor(scene: Scene) {
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
      obstacle.position.set(randomLaneX(), OBSTACLE_HEIGHT / 2, this.nextSpawnZ);
      if (settings.wireframe) {
        obstacle.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        obstacle.edgesWidth = settings.edgeWidth;
        obstacle.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.nextSpawnZ += randomGap(settings.baseSpeed);
      this.obstacles.push(obstacle);
    }
  }

  // Respaces every obstacle ahead of the player for a new run.
  reset(): void {
    this.nextSpawnZ = SPAWN_Z;
    for (const obstacle of this.obstacles) {
      obstacle.position.set(randomLaneX(), OBSTACLE_HEIGHT / 2, this.nextSpawnZ);
      this.nextSpawnZ += randomGap(settings.baseSpeed);
    }
  }

  // The current world position of every active obstacle, so other systems can avoid overlapping them.
  get positions(): Vector3[] {
    return this.obstacles.map((obstacle) => obstacle.position);
  }

  /**
   * Scrolls obstacles toward the player, recycles passed ones, and reports any collision.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   * @param gemPositions - Current gem positions, avoided when recycling an obstacle to a new lane.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3, gemPositions: Vector3[]): boolean {
    const step = speed * deltaSeconds;
    // nextSpawnZ must scroll with everything else, or it drifts further ahead of the world
    // over time (it otherwise only ever increases via recycling), spacing objects out more
    // and more the longer a run lasts.
    this.nextSpawnZ -= step;
    let collided = false;
    for (const obstacle of this.obstacles) {
      obstacle.position.z -= step;
      if (obstacle.position.z < DESPAWN_Z) {
        obstacle.position.z = this.nextSpawnZ;
        obstacle.position.x = pickClearLaneX(this.nextSpawnZ, gemPositions, CROSS_TYPE_MIN_GAP);
        this.nextSpawnZ += randomGap(speed);
      }
      if (!collided && this.isColliding(obstacle.position, playerPosition)) {
        collided = true;
      }
    }
    return collided;
  }

  /**
   * Checks whether the player overlaps an obstacle's lane/z footprint and hasn't jumped over it.
   * @param obstaclePosition - The obstacle's current world position.
   * @param playerPosition - The player mesh's current world position.
   */
  private isColliding(obstaclePosition: Vector3, playerPosition: Vector3): boolean {
    const sameLane = Math.abs(obstaclePosition.x - playerPosition.x) < LANE_HIT_THRESHOLD;
    const closeZ = Math.abs(obstaclePosition.z - playerPosition.z) < Z_HIT_THRESHOLD;
    const playerBottom = playerPosition.y - PLAYER_RADIUS;
    const clearedJump = playerBottom > OBSTACLE_HEIGHT;
    return sameLane && closeZ && !clearedJump;
  }
}

/**
 * Picks a random spacing between consecutive obstacles, shrinking as speed increases so
 * obstacles get denser over the course of a run.
 * @param speed - Current forward speed in units per second, used to scale the gap range down.
 */
function randomGap(speed: number): number {
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
