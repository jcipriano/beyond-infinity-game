import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { DESPAWN_Z } from "./constants";

const STAR_COUNT = 200;
const STAR_SIZE = 0.4;
const TUNNEL_CENTER_Y = 10;
const STAR_MIN_RADIUS = 8;
const STAR_MAX_RADIUS = 40;
const STAR_RANGE_Z = 150;
const PARALLAX_FACTOR = 1.5;

export class StarField {
  private readonly stars: Mesh[] = [];

  /**
   * Creates a pool of billboarded star sprites ringing the track ahead of the player, like a tunnel.
   * @param scene - The Babylon scene to create the star meshes in.
   */
  constructor(scene: Scene) {
    const material = new StandardMaterial("starMat", scene);
    const texture = createStarTexture(scene);
    material.diffuseTexture = texture;
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = Color3.White();
    material.disableLighting = true;
    material.backFaceCulling = false;

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = MeshBuilder.CreatePlane(`star${i}`, { size: STAR_SIZE }, scene);
      star.material = material;
      star.billboardMode = Mesh.BILLBOARDMODE_ALL;
      const { x, y } = randomStarOffset();
      star.position.set(x, y, Math.random() * STAR_RANGE_Z + DESPAWN_Z);
      this.stars.push(star);
    }
  }

  // Rescatters every star around the tunnel ahead of the player for a new run.
  reset(): void {
    for (const star of this.stars) {
      const { x, y } = randomStarOffset();
      star.position.set(x, y, Math.random() * STAR_RANGE_Z + DESPAWN_Z);
    }
  }

  /**
   * Drifts stars toward the player faster than world speed, so they streak past ahead of the
   * track and obstacles, and recycles passed ones back out to the far end of the tunnel.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   * @param speed - Current forward speed in units per second.
   */
  update(deltaSeconds: number, speed: number): void {
    const step = speed * PARALLAX_FACTOR * deltaSeconds;
    for (const star of this.stars) {
      star.position.z -= step;
      if (star.position.z < DESPAWN_Z) {
        const { x, y } = randomStarOffset();
        star.position.x = x;
        star.position.y = y;
        star.position.z += STAR_RANGE_Z;
      }
    }
  }
}

// Picks a random point on a ring around the track's centerline, so stars surround it like a tunnel.
function randomStarOffset(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
  return { x: Math.cos(angle) * radius, y: TUNNEL_CENTER_Y + Math.sin(angle) * radius };
}

/**
 * Draws a small soft-edged white dot into a dynamic texture, used as the star sprite.
 * @param scene - The Babylon scene to create the texture in.
 */
function createStarTexture(scene: Scene): DynamicTexture {
  const size = 32;
  const texture = new DynamicTexture("starTexture", size, scene, false);
  texture.hasAlpha = true;

  const context = texture.getContext();
  const center = size / 2;
  context.clearRect(0, 0, size, size);
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(center, center, center, 0, Math.PI * 2);
  context.fill();
  texture.update();

  return texture;
}
