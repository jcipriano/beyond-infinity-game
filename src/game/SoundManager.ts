import { Scene, Sound } from "@babylonjs/core";
import { settings } from "../settings";

export class SoundManager {
  private readonly music: Sound;
  private readonly gemPickupSound: Sound;
  private readonly obstacleCollisionSound: Sound;

  /**
   * Loads background music and sound effects, ready to be played on demand.
   * @param scene - The Babylon scene to attach the sounds to.
   */
  constructor(scene: Scene) {
    this.music = new Sound("music", "/sounds/music.mp3", scene, null, {
      loop: true,
      volume: settings.sound.musicVolume,
    });
    this.gemPickupSound = new Sound("gemPickup", "/sounds/gem.mp3", scene, null, {
      volume: settings.sound.sfxVolume,
    });
    this.obstacleCollisionSound = new Sound("obstacleCollision", "/sounds/sphere-explosion.mp3", scene, null, {
      volume: settings.sound.sfxVolume,
    });
  }

  // Starts the background music looping, if sound is enabled.
  startMusic(): void {
    if (!settings.sound.enabled) return;
    this.music.play();
  }

  // Stops the background music.
  stopMusic(): void {
    this.music.stop();
  }

  // Plays the gem pickup sound effect, if sound is enabled.
  playGemPickup(): void {
    if (!settings.sound.enabled) return;
    this.gemPickupSound.play();
  }

  // Plays the obstacle collision sound effect, if sound is enabled.
  playObstacleCollision(): void {
    if (!settings.sound.enabled) return;
    this.obstacleCollisionSound.play();
  }
}
