import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CROSS_TYPE_MIN_GAP, DESPAWN_Z, EDGE_ANGLE_EPSILON, SPAWN_Z } from "./constants";
import { Explosion } from "./Explosion";
import { LaneObjectField } from "./LaneObjectField";
import { OBSTACLE_DEPTH, OBSTACLE_HEIGHT, OBSTACLE_WIDTH, isObstacleColliding, randomGap } from "./Obstacles";
import { settings } from "../settings";

const BREAKABLE_OBSTACLE_COUNT = 2;

export class BreakableObstacleField extends LaneObjectField {
  private readonly explosion: Explosion;

  /**
   * Creates the pool of breakable obstacles, spacing them out ahead of the player, cycling
   * evenly through lanes.
   * @param scene - The Babylon scene to create the obstacle meshes in.
   * @param otherPositions - Current obstacle positions, avoided when placing each one.
   */
  constructor(scene: Scene, otherPositions: Vector3[]) {
    super(SPAWN_Z);
    this.explosion = new Explosion(scene);
    const color = new Color3(0.55, 0.8, 1);
    const material = new StandardMaterial("breakableObstacleMat", scene);
    material.diffuseColor = color;
    material.alpha = settings.wireframe ? settings.opacity : 1;

    for (let i = 0; i < BREAKABLE_OBSTACLE_COUNT; i++) {
      const obstacle = MeshBuilder.CreateBox(
        `breakableObstacle${i}`,
        { width: OBSTACLE_WIDTH, height: OBSTACLE_HEIGHT, depth: OBSTACLE_DEPTH },
        scene
      );
      obstacle.material = material;
      const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap(settings.baseSpeed));
      obstacle.position.set(spawnPoint.x, OBSTACLE_HEIGHT / 2, spawnPoint.z);
      if (settings.wireframe) {
        obstacle.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        obstacle.edgesWidth = settings.edgeWidth;
        obstacle.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.items.push(obstacle);
    }
  }

  /**
   * Respaces every breakable obstacle ahead of the player for a new run, cycling evenly through
   * lanes.
   * @param otherPositions - Current obstacle positions, avoided when placing each one.
   */
  reset(otherPositions: Vector3[]): void {
    this.nextSpawnZ = SPAWN_Z;
    this.nextLaneIndex = 0;
    for (const obstacle of this.items) {
      const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap(settings.baseSpeed));
      obstacle.position.set(spawnPoint.x, OBSTACLE_HEIGHT / 2, spawnPoint.z);
    }
    this.explosion.reset();
  }

  /**
   * Scrolls breakable obstacles toward the player, shattering and recycling any the player hits
   * instead of ending the run, and recycles any that simply pass by.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   * @param otherPositions - Current obstacle/gem positions, avoided when recycling to a new lane.
   * @returns The world position of each obstacle broken this frame, captured before it respawns.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3, otherPositions: Vector3[]): Vector3[] {
    const step = speed * deltaSeconds;
    this.scrollSpawnZ(step);
    const brokenPositions: Vector3[] = [];
    for (const obstacle of this.items) {
      obstacle.position.z -= step;
      if (isObstacleColliding(obstacle.position, playerPosition)) {
        brokenPositions.push(obstacle.position.clone());
        this.explosion.trigger(obstacle);
        this.respawn(obstacle, speed, otherPositions);
      } else if (obstacle.position.z < DESPAWN_Z) {
        this.respawn(obstacle, speed, otherPositions);
      }
    }
    this.explosion.update(deltaSeconds);
    return brokenPositions;
  }

  /**
   * Moves a broken or passed obstacle to a new lane at the next spawn point ahead of the player.
   * @param obstacle - The obstacle mesh to reposition.
   * @param speed - Current forward speed in units per second, used to scale the new gap down.
   * @param otherPositions - Current obstacle/gem positions, avoided when choosing the new lane.
   */
  private respawn(obstacle: Mesh, speed: number, otherPositions: Vector3[]): void {
    const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap(speed));
    obstacle.position.x = spawnPoint.x;
    obstacle.position.z = spawnPoint.z;
  }
}
