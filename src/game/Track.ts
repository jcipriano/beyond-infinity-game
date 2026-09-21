import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { DESPAWN_Z, EDGE_ANGLE_EPSILON, GROUND_ALPHA_INDEX, LANE_BOUNDARIES } from "./constants";
import { settings } from "../settings";

const TILE_LENGTH = 40;
const TILE_WIDTH = LANE_BOUNDARIES[LANE_BOUNDARIES.length - 1] - LANE_BOUNDARIES[0];
const TILE_COUNT = 16;

const LANE_LINE_WIDTH = 0.06;
const LANE_LINE_HEIGHT = 0.02;

export class Track {
  private readonly tiles: Mesh[] = [];

  /**
   * Creates a pool of ground tiles laid end to end ahead of the player.
   * @param scene - The Babylon scene to create the tiles in.
   */
  constructor(scene: Scene) {
    const color = new Color3(0.06, 0.15, 0.4);
    const material = new StandardMaterial("trackMat", scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    material.alpha = settings.wireframe ? settings.opacity : 1;

    const laneLineMaterial = new StandardMaterial("laneLineMat", scene);
    laneLineMaterial.emissiveColor = Color3.White();
    laneLineMaterial.disableLighting = true;
    laneLineMaterial.alpha = 0.5;

    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = MeshBuilder.CreateGround(`tile${i}`, { width: TILE_WIDTH, height: TILE_LENGTH }, scene);
      tile.material = material;
      tile.position.z = i * TILE_LENGTH;
      tile.alphaIndex = GROUND_ALPHA_INDEX;
      if (settings.wireframe) {
        tile.enableEdgesRendering(EDGE_ANGLE_EPSILON);
        tile.edgesWidth = settings.edgeWidth;
        tile.edgesColor.set(color.r, color.g, color.b, 1);
      }
      this.tiles.push(tile);

      for (const boundaryX of LANE_BOUNDARIES) {
        const laneLine = MeshBuilder.CreateGround(
          `tile${i}laneLine${boundaryX}`,
          { width: LANE_LINE_WIDTH, height: TILE_LENGTH },
          scene
        );
        laneLine.material = laneLineMaterial;
        laneLine.parent = tile;
        laneLine.position.set(boundaryX, LANE_LINE_HEIGHT, 0);
      }
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
