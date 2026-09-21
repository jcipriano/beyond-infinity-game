import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CROSS_TYPE_MIN_GAP, DESPAWN_Z, EDGE_ANGLE_EPSILON, SPAWN_Z, pickClearLaneX } from "./constants";
import { Explosion } from "./Explosion";
import { settings } from "../settings";

const GEM_COUNT = 10;
const MIN_GAP = 8;
const MAX_GAP = 16;
const GEM_HEIGHT = 0.9;
const PICKUP_RADIUS = 1.3;
const SPIN_SPEED = 3;

export class CollectibleField {
  private readonly gems: Mesh[] = [];
  private readonly explosion: Explosion;
  private nextSpawnZ = SPAWN_Z + MIN_GAP;

  /**
   * Creates the pool of gems, spacing them out ahead of the player in random lanes.
   * @param scene - The Babylon scene to create the gem meshes in.
   * @param obstaclePositions - Current obstacle positions, avoided when placing each gem.
   */
  constructor(private readonly scene: Scene, obstaclePositions: Vector3[]) {
    this.explosion = new Explosion(scene);
    const color = new Color3(1, 0.85, 0.1);
    const material = new StandardMaterial("gemMat", scene);
    material.diffuseColor = color;
    material.emissiveColor = new Color3(0.35, 0.3, 0.05);
    material.alpha = settings.wireframe ? settings.opacity : 1;

    for (let i = 0; i < GEM_COUNT; i++) {
      const gem = MeshBuilder.CreatePolyhedron(`gem${i}`, { type: 1, size: 0.5 }, this.scene);
      gem.material = material;
      const x = pickClearLaneX(this.nextSpawnZ, obstaclePositions, CROSS_TYPE_MIN_GAP);
      gem.position.set(x, GEM_HEIGHT, this.nextSpawnZ);
      if (settings.wireframe) {
        gem.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        gem.edgesWidth = settings.edgeWidth;
        gem.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.nextSpawnZ += randomGap();
      this.gems.push(gem);
    }
  }

  /**
   * Respaces every gem ahead of the player for a new run.
   * @param obstaclePositions - Current obstacle positions, avoided when placing each gem.
   */
  reset(obstaclePositions: Vector3[]): void {
    this.nextSpawnZ = SPAWN_Z + MIN_GAP;
    for (const gem of this.gems) {
      const x = pickClearLaneX(this.nextSpawnZ, obstaclePositions, CROSS_TYPE_MIN_GAP);
      gem.position.set(x, GEM_HEIGHT, this.nextSpawnZ);
      this.nextSpawnZ += randomGap();
    }
    this.explosion.reset();
  }

  // The current world position of every active gem, so other systems can avoid overlapping them.
  get positions(): Vector3[] {
    return this.gems.map((gem) => gem.position);
  }

  /**
   * Scrolls and spins gems toward the player, collecting or recycling each as it passes.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   * @param obstaclePositions - Current obstacle positions, avoided when recycling a gem to a new lane.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3, obstaclePositions: Vector3[]): number {
    const step = speed * deltaSeconds;
    // nextSpawnZ must scroll with everything else, or it drifts further ahead of the world
    // over time (it otherwise only ever increases via recycling), spacing objects out more
    // and more the longer a run lasts.
    this.nextSpawnZ -= step;
    let collected = 0;
    for (const gem of this.gems) {
      gem.position.z -= step;
      gem.rotation.y += SPIN_SPEED * deltaSeconds;

      if (Vector3.Distance(gem.position, playerPosition) < PICKUP_RADIUS) {
        collected += 1;
        this.explosion.trigger(gem);
        this.respawn(gem, obstaclePositions);
      } else if (gem.position.z < DESPAWN_Z) {
        this.respawn(gem, obstaclePositions);
      }
    }
    this.explosion.update(deltaSeconds);
    return collected;
  }

  /**
   * Moves a gem to a new lane at the next spawn point ahead of the player, avoiding obstacles.
   * @param gem - The gem mesh to reposition.
   * @param obstaclePositions - Current obstacle positions, avoided when choosing the new lane.
   */
  private respawn(gem: Mesh, obstaclePositions: Vector3[]): void {
    gem.position.x = pickClearLaneX(this.nextSpawnZ, obstaclePositions, CROSS_TYPE_MIN_GAP);
    gem.position.z = this.nextSpawnZ;
    this.nextSpawnZ += randomGap();
  }
}

// Picks a random spacing between consecutive gems.
function randomGap(): number {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}
