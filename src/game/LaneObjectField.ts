import { Mesh, Vector3 } from "@babylonjs/core";
import { SPAWN_Z, pickClearSpawnPoint } from "./constants";

/**
 * Base class for the three pools of objects that live in the track's lanes (obstacles, gems,
 * breakable obstacles): shared visibility toggling, position reporting, and the spawn-point
 * bookkeeping (lane rotation, nextSpawnZ scrolling/flooring) that keeps them from clipping each
 * other or spawning too close to the player. Each subclass owns its own mesh creation, gap
 * sizing, and what happens when the player reaches one.
 */
export abstract class LaneObjectField {
  protected readonly items: Mesh[] = [];
  protected nextSpawnZ: number;
  // Cycles evenly through all lanes (rather than picking randomly) so a small pool doesn't end
  // up clumped into one or two lanes by chance.
  protected nextLaneIndex = 0;

  /**
   * @param initialSpawnZ - The z position new items should start spawning from.
   */
  constructor(initialSpawnZ: number) {
    this.nextSpawnZ = initialSpawnZ;
  }

  // Shows or hides every item, without affecting their positions or spawn scheduling.
  setVisible(visible: boolean): void {
    for (const item of this.items) item.isVisible = visible;
  }

  // The current world position of every active item, so other systems can avoid overlapping them.
  get positions(): Vector3[] {
    return this.items.map((item) => item.position);
  }

  /**
   * Scrolls nextSpawnZ with the world, floored at SPAWN_Z. Without the floor it would otherwise
   * only ever increase via recycling (drifting further ahead of the world over time), but a
   * small pool can just as easily undershoot it between infrequent recycle events — the floor
   * rules out spawning a "new" item uncomfortably close to the player too.
   * @param step - Distance the world has scrolled this frame (speed * deltaSeconds).
   */
  protected scrollSpawnZ(step: number): void {
    this.nextSpawnZ = Math.max(this.nextSpawnZ - step, SPAWN_Z);
  }

  /**
   * Claims the next clear spawn point in lane rotation — avoiding the given other positions, or
   * simply continuing the rotation if none are given — and advances the lane/z bookkeeping so
   * the following item picks up the rotation from here.
   * @param otherPositions - Positions of other object types' currently active instances to avoid.
   * @param minGap - Minimum z separation required to consider a lane clear at a given z.
   * @param gapAfter - Spacing to leave before the following item, added past this spawn's z.
   */
  protected claimSpawnPoint(otherPositions: Vector3[], minGap: number, gapAfter: number): { x: number; z: number } {
    const spawnPoint = pickClearSpawnPoint(this.nextSpawnZ, otherPositions, minGap, this.nextLaneIndex);
    this.nextLaneIndex = spawnPoint.laneIndex + 1;
    this.nextSpawnZ = spawnPoint.z + gapAfter;
    return { x: spawnPoint.x, z: spawnPoint.z };
  }
}
