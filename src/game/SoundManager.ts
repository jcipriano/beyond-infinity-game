import { Scene, Sound } from "@babylonjs/core";
import { settings } from "../settings";

// Safety cap on how long the intro screen waits for sound effects to load, so a slow or
// missing file never leaves the player stuck unable to start.
const LOAD_TIMEOUT_MS = 5000;

export class SoundManager {
  private readonly music: Sound | null;
  private readonly gemPickupSound: Sound | null;
  private readonly obstacleCollisionSound: Sound | null;
  private readonly sfxReady: Promise<void>;

  /**
   * Loads background music and sound effects, ready to be played on demand. Skips loading
   * entirely when sound is disabled in settings.
   * @param scene - The Babylon scene to attach the sounds to.
   */
  constructor(scene: Scene) {
    if (!settings.sound.enabled) {
      this.music = null;
      this.gemPickupSound = null;
      this.obstacleCollisionSound = null;
      this.sfxReady = Promise.resolve();
      return;
    }

    let resolveGemReady: () => void;
    let resolveObstacleReady: () => void;
    const gemReady = new Promise<void>((resolve) => (resolveGemReady = resolve));
    const obstacleReady = new Promise<void>((resolve) => (resolveObstacleReady = resolve));

    this.music = new Sound("music", "/sounds/neon-chaser.mp3", scene, null, {
      loop: true,
      volume: settings.sound.musicVolume,
    });
    this.gemPickupSound = new Sound("gemPickup", "/sounds/gem.mp3", scene, () => resolveGemReady(), {
      volume: settings.sound.sfxVolume,
    });
    this.obstacleCollisionSound = new Sound(
      "obstacleCollision",
      "/sounds/sphere-explosion.mp3",
      scene,
      () => resolveObstacleReady(),
      { volume: settings.sound.sfxVolume }
    );

    // Music is atmospheric, not essential feedback, so it's not waited on here — a slow or
    // missing music file shouldn't block the player from starting the game.
    const allSfxReady = Promise.all([gemReady, obstacleReady]).then(() => undefined);
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, LOAD_TIMEOUT_MS));
    this.sfxReady = Promise.race([allSfxReady, timeout]);
  }

  // Resolves once the sound effects have loaded, or after a timeout if they haven't.
  whenReady(): Promise<void> {
    return this.sfxReady;
  }

  // Starts the background music looping, if sound is enabled.
  startMusic(): void {
    this.music?.play();
  }

  // Restarts the background music from the beginning, if sound is enabled.
  restartMusic(): void {
    this.music?.stop();
    this.music?.play();
  }

  // Stops the background music.
  stopMusic(): void {
    this.music?.stop();
  }

  // Plays the gem pickup sound effect, if sound is enabled.
  playGemPickup(): void {
    this.gemPickupSound?.play();
  }

  // Plays the obstacle collision sound effect, if sound is enabled.
  playObstacleCollision(): void {
    this.obstacleCollisionSound?.play();
  }
}
