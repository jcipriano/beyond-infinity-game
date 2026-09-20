import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";

const OFFSET = new Vector3(0, 4.5, -8);
const LOOK_AHEAD = new Vector3(0, 1, 6);
const LANE_FOLLOW_SPEED = 6;

export class ChaseCamera {
  private readonly camera: UniversalCamera;

  /**
   * Creates the fixed chase camera behind and above the player's start position.
   * @param scene - The Babylon scene to create the camera in.
   */
  constructor(scene: Scene) {
    this.camera = new UniversalCamera("chaseCamera", OFFSET.clone(), scene);
    this.camera.fov = 0.9;
    scene.activeCamera = this.camera;
  }

  /**
   * Follows the player's x/y/z each frame while always looking straight down +Z (no yaw).
   * @param playerPosition - The player mesh's current world position.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  update(playerPosition: Vector3, deltaSeconds: number): void {
    const targetX = playerPosition.x + OFFSET.x;
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, LANE_FOLLOW_SPEED * deltaSeconds);
    this.camera.position.y = playerPosition.y + OFFSET.y;
    this.camera.position.z = playerPosition.z + OFFSET.z;
    this.camera.setTarget(
      new Vector3(this.camera.position.x, playerPosition.y + LOOK_AHEAD.y, playerPosition.z + LOOK_AHEAD.z)
    );
  }
}
