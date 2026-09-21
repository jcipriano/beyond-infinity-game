import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

interface Popup {
  mesh: Mesh;
  material: StandardMaterial;
  age: number;
}

const POPUP_LIFETIME = 1;
const RISE_SPEED = 2;
const POPUP_WIDTH = 1.1;
const POPUP_HEIGHT = 0.55;
const SPAWN_HEIGHT_OFFSET = 0.8;
const TEXTURE_WIDTH = 256;
const TEXTURE_HEIGHT = 128;

export class ScorePopups {
  private readonly popups: Popup[] = [];

  /**
   * @param scene - The Babylon scene to create popup meshes in.
   */
  constructor(private readonly scene: Scene) {}

  /**
   * Spawns a floating, fading text popup above the given position.
   * @param position - World position the popup rises from.
   * @param text - The text to display, e.g. "+100" or "-50".
   * @param color - The text color.
   */
  show(position: Vector3, text: string, color: Color3): void {
    const material = new StandardMaterial("scorePopupMat", this.scene);
    material.diffuseTexture = createTextTexture(this.scene, text, color);
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = color;
    material.disableLighting = true;
    material.backFaceCulling = false;

    const mesh = MeshBuilder.CreatePlane("scorePopup", { width: POPUP_WIDTH, height: POPUP_HEIGHT }, this.scene);
    mesh.material = material;
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.position.set(position.x, position.y + SPAWN_HEIGHT_OFFSET, position.z);

    this.popups.push({ mesh, material, age: 0 });
  }

  /**
   * Rises and fades each active popup, disposing it once its lifetime expires.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  update(deltaSeconds: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.age += deltaSeconds;
      if (popup.age >= POPUP_LIFETIME) {
        popup.mesh.dispose();
        popup.material.dispose();
        this.popups.splice(i, 1);
        continue;
      }
      popup.mesh.position.y += RISE_SPEED * deltaSeconds;
      popup.material.alpha = 1 - popup.age / POPUP_LIFETIME;
    }
  }

  // Disposes all active popups, for a new run.
  reset(): void {
    for (const popup of this.popups) {
      popup.mesh.dispose();
      popup.material.dispose();
    }
    this.popups.length = 0;
  }
}

/**
 * Draws the given text into a dynamic texture, used as a popup's sprite.
 * @param scene - The Babylon scene to create the texture in.
 * @param text - The text to draw.
 * @param color - The text color.
 */
function createTextTexture(scene: Scene, text: string, color: Color3): DynamicTexture {
  const texture = new DynamicTexture(
    "scorePopupTexture",
    { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT },
    scene,
    false
  );
  texture.hasAlpha = true;

  const context = texture.getContext();
  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const fontSize = 72;
  context.font = `bold ${fontSize}px Oxanium, sans-serif`;
  context.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  // Babylon's canvas typings don't declare textAlign/textBaseline, so center manually: measure
  // the text width for x, and use the usual ~0.35*fontSize baseline offset for vertical centering.
  const textWidth = context.measureText(text).width;
  context.fillText(text, (TEXTURE_WIDTH - textWidth) / 2, TEXTURE_HEIGHT / 2 + fontSize * 0.35);
  texture.update();

  return texture;
}
