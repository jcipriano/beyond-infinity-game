import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { DESPAWN_Z } from "./constants";

const TILE_LENGTH = 40;
const TILE_WIDTH = 12;
const TILE_COUNT = 16;

export class Track {
  private readonly tiles: Mesh[] = [];

  /**
   * Creates a pool of ground tiles laid end to end ahead of the player.
   * @param scene - The Babylon scene to create the tiles in.
   */
  constructor(scene: Scene) {
    const material = new StandardMaterial("trackMat", scene);
    material.diffuseColor = new Color3(0.15, 0.35, 0.2);
    material.specularColor = Color3.Black();

    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = MeshBuilder.CreateGround(`tile${i}`, { width: TILE_WIDTH, height: TILE_LENGTH }, scene);
      tile.material = material;
      tile.position.z = i * TILE_LENGTH;
      this.tiles.push(tile);
    }
  }

  // Lines the tiles back up in their original end-to-end order for a new run.
  reset(): void {
    this.tiles.forEach((tile, i) => (tile.position.z = i * TILE_LENGTH));
  }

  /**
   * Scrolls every tile toward the player and recycles it to the far end once passed.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   */
  update(deltaSeconds: number, speed: number): void {
    const step = speed * deltaSeconds;
    for (const tile of this.tiles) {
      tile.position.z -= step;
      if (tile.position.z < DESPAWN_Z - TILE_LENGTH / 2) {
        tile.position.z += TILE_COUNT * TILE_LENGTH;
      }
    }
  }
}
