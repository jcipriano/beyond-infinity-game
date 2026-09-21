import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CROSS_TYPE_MIN_GAP, DESPAWN_Z, EDGE_ANGLE_EPSILON, SPAWN_Z } from "./constants";
import { Explosion } from "./Explosion";
import { LaneObjectField } from "./LaneObjectField";
import { settings } from "../settings";

const GEM_COUNT = 10;
const MIN_GAP = 8;
const MAX_GAP = 16;
const GEM_HEIGHT = 0.9;
const PICKUP_RADIUS = 1.3;
const SPIN_SPEED = 3;

export class CollectibleField extends LaneObjectField {
  private readonly explosion: Explosion;

  /**
   * Creates the pool of gems, spacing them out ahead of the player, cycling evenly through lanes.
   * @param scene - The Babylon scene to create the gem meshes in.
   * @param otherPositions - Current obstacle/breakable-obstacle positions, avoided when placing
   * each gem.
   */
  constructor(scene: Scene, otherPositions: Vector3[]) {
    super(SPAWN_Z + MIN_GAP);
    this.explosion = new Explosion(scene);
    const color = new Color3(1, 0.85, 0.1);
    const material = new StandardMaterial("gemMat", scene);
    material.diffuseColor = color;
    material.emissiveColor = new Color3(0.35, 0.3, 0.05);
    material.alpha = settings.wireframe ? settings.opacity : 1;

    for (let i = 0; i < GEM_COUNT; i++) {
      const gem = MeshBuilder.CreatePolyhedron(`gem${i}`, { type: 1, size: 0.5 }, scene);
      gem.material = material;
      const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap());
      gem.position.set(spawnPoint.x, GEM_HEIGHT, spawnPoint.z);
      if (settings.wireframe) {
        gem.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        gem.edgesWidth = settings.edgeWidth;
        gem.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.items.push(gem);
    }
  }

  /**
   * Respaces every gem ahead of the player for a new run, cycling evenly through lanes.
   * @param otherPositions - Current obstacle/breakable-obstacle positions, avoided when placing
   * each gem.
   */
  reset(otherPositions: Vector3[]): void {
    this.nextSpawnZ = SPAWN_Z + MIN_GAP;
    this.nextLaneIndex = 0;
    for (const gem of this.items) {
      const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap());
      gem.position.set(spawnPoint.x, GEM_HEIGHT, spawnPoint.z);
    }
    this.explosion.reset();
  }

  /**
   * Scrolls and spins gems toward the player, collecting or recycling each as it passes.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   * @param otherPositions - Current obstacle/breakable-obstacle positions, avoided when
   * recycling a gem to a new lane.
   * @returns The world position of each gem collected this frame, captured before it respawns.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3, otherPositions: Vector3[]): Vector3[] {
    const step = speed * deltaSeconds;
    this.scrollSpawnZ(step);
    const collectedPositions: Vector3[] = [];
    for (const gem of this.items) {
      gem.position.z -= step;
      gem.rotation.y += SPIN_SPEED * deltaSeconds;

      if (Vector3.Distance(gem.position, playerPosition) < PICKUP_RADIUS) {
        collectedPositions.push(gem.position.clone());
        this.explosion.trigger(gem);
        this.respawn(gem, otherPositions);
      } else if (gem.position.z < DESPAWN_Z) {
        this.respawn(gem, otherPositions);
      }
    }
    this.explosion.update(deltaSeconds);
    return collectedPositions;
  }

  /**
   * Moves a gem to a new lane at the next spawn point ahead of the player, avoiding obstacles.
   * @param gem - The gem mesh to reposition.
   * @param otherPositions - Current obstacle/breakable-obstacle positions, avoided when choosing
   * the new lane.
   */
  private respawn(gem: Mesh, otherPositions: Vector3[]): void {
    const spawnPoint = this.claimSpawnPoint(otherPositions, CROSS_TYPE_MIN_GAP, randomGap());
    gem.position.x = spawnPoint.x;
    gem.position.z = spawnPoint.z;
  }
}

// Picks a random spacing between consecutive gems.
function randomGap(): number {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}
