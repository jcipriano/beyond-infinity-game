import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import {
  GRAVITY,
  GROUND_Y,
  JUMP_SPEED,
  LANE_COUNT,
  LANE_LERP_SPEED,
  LANE_X_POSITIONS,
  PLAYER_RADIUS,
  ROLL_VISUAL_DAMPING,
} from "./constants";
import { settings } from "../settings";

const START_LANE = 1;

export class Player {
  readonly mesh: Mesh;
  private laneIndex = START_LANE;
  private verticalVelocity = 0;
  private grounded = true;

  /**
   * Creates the player sphere in the center lane and wires up lane/jump input.
   * @param scene - The Babylon scene to create the player mesh in.
   */
  constructor(scene: Scene) {
    this.mesh = MeshBuilder.CreateSphere("player", { diameter: PLAYER_RADIUS * 2, segments: 12 }, scene);
    this.mesh.position.set(LANE_X_POSITIONS[this.laneIndex], GROUND_Y + PLAYER_RADIUS, 0);

    const material = new StandardMaterial("playerMat", scene);
    material.diffuseColor = new Color3(0.9, 0.55, 0.15);
    material.wireframe = settings.wireframe;
    this.mesh.material = material;

    window.addEventListener("keydown", (event) => this.handleKeyDown(event.key.toLowerCase()));
  }

  // Returns the player to the starting lane and grounded state for a new run.
  reset(): void {
    this.laneIndex = START_LANE;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.mesh.position.set(LANE_X_POSITIONS[this.laneIndex], GROUND_Y + PLAYER_RADIUS, 0);
  }

  /**
   * Lerps toward the target lane, applies gravity/jump physics, and rolls the ball each frame.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward travel speed in units per second.
   */
  update(deltaSeconds: number, speed: number): void {
    const targetX = LANE_X_POSITIONS[this.laneIndex];
    this.mesh.position.x += (targetX - this.mesh.position.x) * Math.min(1, LANE_LERP_SPEED * deltaSeconds);

    this.verticalVelocity += GRAVITY * deltaSeconds;
    this.mesh.position.y += this.verticalVelocity * deltaSeconds;
    if (this.mesh.position.y <= GROUND_Y + PLAYER_RADIUS) {
      this.mesh.position.y = GROUND_Y + PLAYER_RADIUS;
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    this.mesh.rotation.x += (speed / PLAYER_RADIUS) * ROLL_VISUAL_DAMPING * deltaSeconds;
  }

  /**
   * Maps a keydown event to a lane change or jump.
   * @param key - The lowercased `KeyboardEvent.key` value that was pressed.
   */
  private handleKeyDown(key: string): void {
    if (key === "a" || key === "arrowleft") this.changeLane(-1);
    if (key === "d" || key === "arrowright") this.changeLane(1);
    if (key === " " || key === "w" || key === "arrowup") this.jump();
  }

  /**
   * Moves the lane index by one step, clamped to the available lanes.
   * @param direction - `-1` to move left one lane, `1` to move right one lane.
   */
  private changeLane(direction: number): void {
    this.laneIndex = clamp(this.laneIndex + direction, 0, LANE_COUNT - 1);
  }

  // Starts a jump if the player is currently grounded.
  private jump(): void {
    if (!this.grounded) return;
    this.verticalVelocity = JUMP_SPEED;
    this.grounded = false;
  }
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
