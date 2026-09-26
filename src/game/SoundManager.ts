import { Scene, Sound } from "@babylonjs/core";
import { settings } from "../settings";
import sfxConfig from "../../sfx.json";

// Safety cap on how long the intro screen waits for sound effects to load, so a slow or
// missing file never leaves the player stuck unable to start.
const LOAD_TIMEOUT_MS = 5000;

// A single-file sound effect, e.g. gem pickup or obstacle collision.
interface SimpleSfxDefinition {
  file: string;
  loop?: boolean;
  volume: "music" | "sfx";
  essential?: boolean;
}

// One score-gated music track. Tiers are sorted ascending by threshold; the first tier's
// threshold is conventionally 0 so it's always active at game start.
interface MusicTier {
  file: string;
  threshold: number;
}

// A music definition that changes track at score thresholds, switching only at loop boundaries.
interface TieredSfxDefinition {
  tiers: MusicTier[];
  volume: "music" | "sfx";
  essential?: boolean;
}

type SfxDefinition = SimpleSfxDefinition | TieredSfxDefinition;

// Narrows an SfxDefinition to the tiered shape.
function isTiered(definition: SfxDefinition): definition is TieredSfxDefinition {
  return "tiers" in definition;
}

export class SoundManager {
  private readonly sounds = new Map<string, Sound>();
  private readonly sfxReady: Promise<void>;

  // Per-tier Sound objects for the music track, sorted ascending by threshold, and the score at
  // which each one becomes eligible to play. Empty when sound is disabled or sfx.json has no
  // tiered "music" entry.
  private readonly musicTiers: { sound: Sound; threshold: number }[] = [];

  // Index into musicTiers of the tier currently playing.
  private currentMusicTierIndex = 0;

  // The tier index that should take over the next time the current loop ends. Kept separate from
  // currentMusicTierIndex so a mid-loop score change never interrupts the playing loop early.
  private desiredMusicTierIndex = 0;

  // True between a stopMusic()/restartMusic() call and its Sound.stop() actually landing, so the
  // resulting onEndedObservable firing (Babylon's stop() triggers it too) doesn't get mistaken for
  // a natural loop finishing and auto-resume playback.
  private musicStopped = false;

  /**
   * Loads every sound defined in sfx.json, ready to be played on demand. Skips loading
   * entirely when sound is disabled in settings.
   * @param scene - The Babylon scene to attach the sounds to.
   */
  constructor(scene: Scene) {
    if (!settings.sound.enabled) {
      this.sfxReady = Promise.resolve();
      return;
    }

    const essentialReady: Promise<void>[] = [];

    for (const [key, definition] of Object.entries(sfxConfig as Record<string, SfxDefinition>)) {
      const volume = definition.volume === "music" ? settings.sound.musicVolume : settings.sound.sfxVolume;

      if (isTiered(definition)) {
        this.loadMusicTiers(scene, definition, volume, essentialReady);
        continue;
      }

      let resolveReady: () => void;
      const ready = new Promise<void>((resolve) => (resolveReady = resolve));
      if (definition.essential) essentialReady.push(ready);

      const sound = new Sound(key, definition.file, scene, () => resolveReady(), {
        loop: definition.loop ?? false,
        volume,
      });
      this.sounds.set(key, sound);
    }

    // Music is atmospheric, not essential feedback, so a sound only blocks on this when marked
    // "essential" in sfx.json — a slow or missing music file shouldn't block the player from starting.
    const allEssentialReady = Promise.all(essentialReady).then(() => undefined);
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, LOAD_TIMEOUT_MS));
    this.sfxReady = Promise.race([allEssentialReady, timeout]);
  }

  /**
   * Loads every tier of a tiered music definition as its own non-looping Sound, sorted ascending
   * by threshold, and wires each one's onEndedObservable to hand off to whichever tier the score
   * currently qualifies for once its loop finishes.
   * @param scene - The Babylon scene to attach the sounds to.
   * @param definition - The tiered music definition from sfx.json.
   * @param volume - The resolved playback volume for this definition.
   * @param essentialReady - Collects a readiness promise if this definition is marked essential.
   */
  private loadMusicTiers(
    scene: Scene,
    definition: TieredSfxDefinition,
    volume: number,
    essentialReady: Promise<void>[]
  ): void {
    const sortedTiers = [...definition.tiers].sort((a, b) => a.threshold - b.threshold);

    let resolveReady: () => void;
    const ready = new Promise<void>((resolve) => (resolveReady = resolve));
    if (definition.essential) essentialReady.push(ready);

    let loadedCount = 0;
    for (const tier of sortedTiers) {
      const index = this.musicTiers.length;
      const sound = new Sound(
        `music-${index}`,
        tier.file,
        scene,
        () => {
          loadedCount += 1;
          if (loadedCount === sortedTiers.length) resolveReady();
        },
        { loop: false, volume }
      );
      sound.onEndedObservable.add(() => this.onMusicLoopEnded(index));
      this.musicTiers.push({ sound, threshold: tier.threshold });
    }
  }

  // Resolves once the essential sound effects have loaded, or after a timeout if they haven't.
  whenReady(): Promise<void> {
    return this.sfxReady;
  }

  // Starts the background music at the current desired tier, if sound is enabled.
  startMusic(): void {
    if (this.musicTiers.length === 0) return;
    this.musicStopped = false;
    this.currentMusicTierIndex = this.desiredMusicTierIndex;
    this.musicTiers[this.currentMusicTierIndex].sound.play();
  }

  // Restarts the background music from tier 0, if sound is enabled.
  restartMusic(): void {
    if (this.musicTiers.length === 0) return;
    this.musicStopped = false;
    this.musicTiers[this.currentMusicTierIndex].sound.stop();
    this.currentMusicTierIndex = 0;
    this.desiredMusicTierIndex = 0;
    this.musicTiers[0].sound.play();
  }

  // Stops the background music.
  stopMusic(): void {
    if (this.musicTiers.length === 0) return;
    this.musicStopped = true;
    this.musicTiers[this.currentMusicTierIndex].sound.stop();
  }

  /**
   * Records the latest score so the next loop boundary can pick up the highest-scoring music
   * tier the score currently qualifies for. Never interrupts the currently playing loop early —
   * any switch happens only in onMusicLoopEnded, once the current track finishes.
   * @param score - The player's current score.
   */
  updateMusicScore(score: number): void {
    if (this.musicTiers.length === 0) return;
    let qualifyingIndex = 0;
    for (let i = 0; i < this.musicTiers.length; i++) {
      if (score >= this.musicTiers[i].threshold) qualifyingIndex = i;
    }
    this.desiredMusicTierIndex = qualifyingIndex;
  }

  /**
   * Fires when one music tier's loop finishes playing (or is stopped). Advances playback to
   * whichever tier the score currently qualifies for, jumping straight there even if multiple
   * thresholds were crossed mid-loop.
   * @param endedIndex - The tier index whose loop just ended.
   */
  private onMusicLoopEnded(endedIndex: number): void {
    // Babylon's Sound.stop() also fires onEndedObservable (asynchronously), so a stopMusic()/
    // restartMusic() call must not be mistaken here for a loop finishing naturally.
    if (this.musicStopped || endedIndex !== this.currentMusicTierIndex) return;
    this.currentMusicTierIndex = this.desiredMusicTierIndex;
    this.musicTiers[this.currentMusicTierIndex].sound.play();
  }

  // Plays the gem pickup sound effect, if sound is enabled.
  playGemPickup(): void {
    this.sounds.get("gemPickup")?.play();
  }

  // Plays the obstacle collision sound effect, if sound is enabled.
  playObstacleCollision(): void {
    this.sounds.get("obstacleCollision")?.play();
  }
}
