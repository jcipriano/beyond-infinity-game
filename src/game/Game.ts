import { Color3, Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { BreakableObstacleField } from "./BreakableObstacles";
import { ChaseCamera } from "./ChaseCamera";
import { CollectibleField } from "./Collectibles";
import { Explosion } from "./Explosion";
import { GameOverScreen } from "./GameOverScreen";
import { IntroScreen } from "./IntroScreen";
import { ObstacleField } from "./Obstacles";
import { Player } from "./Player";
import { ScorePopups } from "./ScorePopups";
import { SoundManager } from "./SoundManager";
import { StarField } from "./StarField";
import { Track } from "./Track";
import { settings } from "../settings";

type RunState = "intro" | "running" | "gameover";

const GEM_SCORE = 100;
const BREAKABLE_OBSTACLE_PENALTY = 50;
const GAME_OVER_DELAY_MS = 1000;
const POSITIVE_POPUP_COLOR = new Color3(0.3, 1, 0.4);
const NEGATIVE_POPUP_COLOR = new Color3(1, 0.3, 0.3);

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly starField: StarField;
  private readonly track: Track;
  private readonly player: Player;
  private readonly obstacles: ObstacleField | null;
  private readonly breakableObstacles: BreakableObstacleField | null;
  private readonly collectibles: CollectibleField | null;
  private readonly camera: ChaseCamera;
  private readonly explosion: Explosion;
  private readonly scorePopups: ScorePopups;
  private readonly sound: SoundManager;
  private readonly introScreen: IntroScreen;
  private readonly gameOverScreen: GameOverScreen;

  private readonly scoreLabel = document.getElementById("score");
  private readonly timerLabel = document.getElementById("timer");
  private readonly speedLabel = document.getElementById("speed");
  private readonly gemCountLabel = document.getElementById("gemCount");

  private state: RunState = "intro";
  private previewStarted = false;
  private elapsedSeconds = 0;
  private score = 0;
  private gemsCollected = 0;
  private gameOverTimeoutId: number | undefined;

  /**
   * Builds the engine, scene, and all game systems, and wires up restart input.
   * @param canvas - The HTML canvas element Babylon renders into.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, audioEngine: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.07, 0.12, 1);

    new HemisphericLight("skyLight", new Vector3(0.2, 1, 0.1), this.scene);

    this.starField = new StarField(this.scene);
    this.track = new Track(this.scene);
    this.player = new Player(this.scene);
    const spawnObstacles = !settings.testMode.enabled || settings.testMode.spawn !== "gems";
    const spawnGems = !settings.testMode.enabled || settings.testMode.spawn !== "obstacles";
    this.obstacles = spawnObstacles ? new ObstacleField(this.scene) : null;
    this.breakableObstacles = spawnObstacles
      ? new BreakableObstacleField(this.scene, this.obstacles?.positions ?? [])
      : null;
    const hazardPositions = [...(this.obstacles?.positions ?? []), ...(this.breakableObstacles?.positions ?? [])];
    this.collectibles = spawnGems ? new CollectibleField(this.scene, hazardPositions) : null;
    // Obstacles/gems stay hidden until the run actually starts, so the intro/countdown preview
    // shows an empty track.
    this.obstacles?.setVisible(false);
    this.breakableObstacles?.setVisible(false);
    this.collectibles?.setVisible(false);
    this.camera = new ChaseCamera(this.scene);
    // Orients the camera correctly right away, so it doesn't snap into place when gameplay
    // starts after sitting at its default orientation through the intro/countdown screens.
    this.camera.update(this.player.mesh.position, 0);
    this.explosion = new Explosion(this.scene);
    this.scorePopups = new ScorePopups(this.scene);
    this.sound = new SoundManager(this.scene);
    this.introScreen = new IntroScreen(
      () => this.sound.startMusic(),
      () => this.beginRun()
    );
    this.sound.whenReady().then(() => {
      this.previewStarted = true;
      this.introScreen.showStartButton();
    });
    this.gameOverScreen = new GameOverScreen(() => this.restart());

    window.addEventListener("resize", () => this.engine.resize());
  }

  // Starts Babylon's render loop, updating game state only while a run is active.
  run(): void {
    this.engine.runRenderLoop(() => {
      const deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      if (this.state === "running") this.update(deltaSeconds);
      else if (this.previewStarted && this.state !== "gameover") this.updatePreview(deltaSeconds);
      this.explosion.update(deltaSeconds);
      this.scorePopups.update(deltaSeconds);
      this.scene.render();
    });
  }

  /**
   * Animates the rolling player, scrolling track, and starfield at the base speed, without
   * advancing the timer/score or spawning obstacles/gems, for the intro/countdown screens.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  private updatePreview(deltaSeconds: number): void {
    this.player.update(deltaSeconds, settings.baseSpeed);
    this.starField.update(deltaSeconds, settings.baseSpeed);
    this.track.update(deltaSeconds, settings.baseSpeed);
    this.camera.update(this.player.mesh.position, deltaSeconds);
  }

  /**
   * Advances speed and every game system for one frame, ending the run on collision.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  private update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    this.updateTimerLabel();
    const speed = Math.min(settings.baseSpeed + this.elapsedSeconds * settings.speedRamp, settings.maxSpeed);
    this.updateSpeedLabel(speed);

    this.player.update(deltaSeconds, speed);
    this.starField.update(deltaSeconds, speed);
    this.track.update(deltaSeconds, speed);

    // Each of these three reads the others' current positions inline (not a snapshot taken up
    // front), so every call sees the freshest state, including anything the earlier calls this
    // same frame already moved — otherwise two independent fields could both pick the same
    // just-vacated slot in the same frame without seeing each other's choice.
    const gemsCollectedPositions =
      this.collectibles?.update(deltaSeconds, speed, this.player.mesh.position, [
        ...(this.obstacles?.positions ?? []),
        ...(this.breakableObstacles?.positions ?? []),
      ]) ?? [];
    const collided =
      this.obstacles?.update(deltaSeconds, speed, this.player.mesh.position, [
        ...(this.collectibles?.positions ?? []),
        ...(this.breakableObstacles?.positions ?? []),
      ]) ?? false;
    const breakableHitPositions =
      this.breakableObstacles?.update(deltaSeconds, speed, this.player.mesh.position, [
        ...(this.obstacles?.positions ?? []),
        ...(this.collectibles?.positions ?? []),
      ]) ?? [];
    this.camera.update(this.player.mesh.position, deltaSeconds);

    this.score += gemsCollectedPositions.length * GEM_SCORE;
    this.score -= breakableHitPositions.length * BREAKABLE_OBSTACLE_PENALTY;
    this.score = Math.max(0, this.score);
    this.gemsCollected += gemsCollectedPositions.length;
    for (const position of gemsCollectedPositions) {
      this.scorePopups.show(position, `+${GEM_SCORE}`, POSITIVE_POPUP_COLOR);
    }
    for (const position of breakableHitPositions) {
      this.scorePopups.show(position, `-${BREAKABLE_OBSTACLE_PENALTY}`, NEGATIVE_POPUP_COLOR);
    }
    this.updateScoreLabel();
    this.updateGemCountLabel();
    if (gemsCollectedPositions.length > 0) this.sound.playGemPickup();

    const collisionEnabled = !settings.testMode.enabled || settings.testMode.collideWithObstacles;
    if (collided && collisionEnabled) this.endRun();
  }

  // Renders the current score into the HUD.
  private updateScoreLabel(): void {
    if (!this.scoreLabel) return;
    this.scoreLabel.textContent = String(this.score);
  }

  // Renders the number of gems collected so far into the HUD.
  private updateGemCountLabel(): void {
    if (!this.gemCountLabel) return;
    this.gemCountLabel.textContent = `Gems: ${this.gemsCollected}`;
  }

  // Renders elapsed run time as minutes:seconds.tenths into the HUD.
  private updateTimerLabel(): void {
    if (!this.timerLabel) return;
    const totalSeconds = Math.floor(this.elapsedSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((this.elapsedSeconds - totalSeconds) * 10);
    this.timerLabel.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
  }

  /**
   * Renders the current forward speed into the HUD.
   * @param speed - Current forward speed in units per second.
   */
  private updateSpeedLabel(speed: number): void {
    if (!this.speedLabel) return;
    this.speedLabel.textContent = `Speed: ${Math.round(speed)} mph`;
  }

  // Reveals obstacles/gems and starts the real run, once the intro countdown finishes.
  private beginRun(): void {
    this.obstacles?.setVisible(true);
    this.breakableObstacles?.setVisible(true);
    this.collectibles?.setVisible(true);
    this.state = "running";
  }

  // Switches to the game-over state and shatters the player, revealing the overlay after a delay.
  private endRun(): void {
    this.state = "gameover";
    this.explosion.trigger(this.player.mesh);
    this.sound.playObstacleCollision();
    this.player.mesh.isVisible = false;
    this.gameOverTimeoutId = window.setTimeout(() => {
      this.gameOverScreen.show(this.scoreLabel?.textContent ?? "0");
    }, GAME_OVER_DELAY_MS);
  }

  // Resets score, systems, and state so a new run starts from scratch.
  private restart(): void {
    window.clearTimeout(this.gameOverTimeoutId);
    this.elapsedSeconds = 0;
    this.score = 0;
    this.gemsCollected = 0;
    this.updateScoreLabel();
    this.updateGemCountLabel();
    this.updateTimerLabel();
    this.updateSpeedLabel(settings.baseSpeed);
    this.gameOverScreen.hide();

    this.player.reset();
    this.player.mesh.isVisible = true;
    this.starField.reset();
    this.track.reset();
    this.obstacles?.reset();
    this.breakableObstacles?.reset(this.obstacles?.positions ?? []);
    this.collectibles?.reset([...(this.obstacles?.positions ?? []), ...(this.breakableObstacles?.positions ?? [])]);
    this.explosion.reset();
    this.scorePopups.reset();
    this.sound.restartMusic();

    this.state = "running";
  }
}
