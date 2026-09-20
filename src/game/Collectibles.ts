import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { DESPAWN_Z, SPAWN_Z, randomLaneX } from "./constants";
import { settings } from "../settings";

const GEM_COUNT = 10;
const MIN_GAP = 8;
const MAX_GAP = 16;
const GEM_HEIGHT = 0.9;
const PICKUP_RADIUS = 1.3;
const SPIN_SPEED = 3;

export class CollectibleField {
  private readonly gems: Mesh[] = [];
  private nextSpawnZ = SPAWN_Z + MIN_GAP;

  /**
   * Creates the pool of gems, spacing them out ahead of the player in random lanes.
   * @param scene - The Babylon scene to create the gem meshes in.
   */
  constructor(private readonly scene: Scene) {
    const material = new StandardMaterial("gemMat", scene);
    material.diffuseColor = new Color3(0.2, 0.8, 0.9);
    material.emissiveColor = new Color3(0.05, 0.3, 0.35);
    material.wireframe = settings.wireframe;

    for (let i = 0; i < GEM_COUNT; i++) {
      const gem = MeshBuilder.CreatePolyhedron(`gem${i}`, { type: 1, size: 0.5 }, this.scene);
      gem.material = material;
      gem.position.set(randomLaneX(), GEM_HEIGHT, this.nextSpawnZ);
      this.nextSpawnZ += randomGap();
      this.gems.push(gem);
    }
  }

  // Respaces every gem ahead of the player for a new run.
  reset(): void {
    this.nextSpawnZ = SPAWN_Z + MIN_GAP;
    for (const gem of this.gems) {
      gem.position.set(randomLaneX(), GEM_HEIGHT, this.nextSpawnZ);
      this.nextSpawnZ += randomGap();
    }
  }

  /**
   * Scrolls and spins gems toward the player, collecting or recycling each as it passes.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   * @param playerPosition - The player mesh's current world position.
   */
  update(deltaSeconds: number, speed: number, playerPosition: Vector3): number {
    const step = speed * deltaSeconds;
    let collected = 0;
    for (const gem of this.gems) {
      gem.position.z -= step;
      gem.rotation.y += SPIN_SPEED * deltaSeconds;

      if (Vector3.Distance(gem.position, playerPosition) < PICKUP_RADIUS) {
        collected += 1;
        this.respawn(gem);
      } else if (gem.position.z < DESPAWN_Z) {
        this.respawn(gem);
      }
    }
    return collected;
  }

  /**
   * Moves a gem to a new random lane at the next spawn point ahead of the player.
   * @param gem - The gem mesh to reposition.
   */
  private respawn(gem: Mesh): void {
    gem.position.x = randomLaneX();
    gem.position.z = this.nextSpawnZ;
    this.nextSpawnZ += randomGap();
  }
}

// Picks a random spacing between consecutive gems.
function randomGap(): number {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}
