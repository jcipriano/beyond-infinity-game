import { Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { ChaseCamera } from "./ChaseCamera";
import { CollectibleField } from "./Collectibles";
import { Explosion } from "./Explosion";
import { ObstacleField } from "./Obstacles";
import { Player } from "./Player";
import { SoundManager } from "./SoundManager";
import { StarField } from "./StarField";
import { Track } from "./Track";
import { settings } from "../settings";

type RunState = "intro" | "countdown" | "running" | "gameover";

const GEM_SCORE = 10;
const GAME_OVER_DELAY_MS = 1000;
const COUNTDOWN_SECONDS = 3;

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly starField: StarField;
  private readonly track: Track;
  private readonly player: Player;
  private readonly obstacles: ObstacleField | null;
  private readonly collectibles: CollectibleField | null;
  private readonly camera: ChaseCamera;
  private readonly explosion: Explosion;
  private readonly sound: SoundManager;

  private readonly scoreLabel = document.getElementById("score");
  private readonly timerLabel = document.getElementById("timer");
  private readonly speedLabel = document.getElementById("speed");
  private readonly gemCountLabel = document.getElementById("gemCount");
  private readonly gameOverOverlay = document.getElementById("gameOver");
  private readonly finalScoreLabel = document.getElementById("finalScore");
  private readonly introOverlay = document.getElementById("intro");
  private readonly introTitle = document.getElementById("introTitle");
  private readonly introStatusLabel = document.getElementById("introStatus");
  private readonly startButton = document.getElementById("startButton");

  private state: RunState = "intro";
  private previewStarted = false;
  private elapsedSeconds = 0;
  private distance = 0;
  private gemScore = 0;
  private gemsCollected = 0;
  private gameOverTimeoutId: number | undefined;
  private countdownRemaining = COUNTDOWN_SECONDS;
  private countdownIntervalId: number | undefined;

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
    this.collectibles = spawnGems ? new CollectibleField(this.scene, this.obstacles?.positions ?? []) : null;
    // Obstacles/gems stay hidden until the run actually starts, so the intro/countdown preview
    // shows an empty track.
    this.obstacles?.setVisible(false);
    this.collectibles?.setVisible(false);
    this.camera = new ChaseCamera(this.scene);
    // Orients the camera correctly right away, so it doesn't snap into place when gameplay
    // starts after sitting at its default orientation through the intro/countdown screens.
    this.camera.update(this.player.mesh.position, 0);
    this.explosion = new Explosion(this.scene);
    this.sound = new SoundManager(this.scene);
    this.sound.whenReady().then(() => this.showStartButton());

    if (settings.testMode.enabled && !settings.testMode.dimGameOver) {
      this.gameOverOverlay?.classList.add("noDim");
    }

    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "r" && this.state === "gameover" && !this.gameOverOverlay?.classList.contains("hidden")) {
        this.restart();
      }
      if (key === "enter" && this.state === "intro" && !this.startButton?.classList.contains("hidden")) {
        this.beginCountdown();
      }
    });
    document.getElementById("restartButton")?.addEventListener("click", () => this.restart());
    this.startButton?.addEventListener("click", () => this.beginCountdown());
  }

  // Starts Babylon's render loop, updating game state only while a run is active.
  run(): void {
    this.engine.runRenderLoop(() => {
      const deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      if (this.state === "running") this.update(deltaSeconds);
      else if (this.previewStarted && this.state !== "gameover") this.updatePreview(deltaSeconds);
      this.explosion.update(deltaSeconds);
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
   * Advances speed/distance and every game system for one frame, ending the run on collision.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  private update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    this.updateTimerLabel();
    const speed = Math.min(settings.baseSpeed + this.elapsedSeconds * settings.speedRamp, settings.maxSpeed);
    this.distance += speed * deltaSeconds;
    this.updateSpeedLabel(speed);

    this.player.update(deltaSeconds, speed);
    this.starField.update(deltaSeconds, speed);
    this.track.update(deltaSeconds, speed);
    const gemsCollectedThisFrame =
      this.collectibles?.update(deltaSeconds, speed, this.player.mesh.position, this.obstacles?.positions ?? []) ?? 0;
    const collided =
      this.obstacles?.update(deltaSeconds, speed, this.player.mesh.position, this.collectibles?.positions ?? []) ??
      false;
    this.camera.update(this.player.mesh.position, deltaSeconds);

    this.gemScore += gemsCollectedThisFrame * GEM_SCORE;
    this.gemsCollected += gemsCollectedThisFrame;
    this.updateScoreLabel();
    this.updateGemCountLabel();
    if (gemsCollectedThisFrame > 0) this.sound.playGemPickup();

    const collisionEnabled = !settings.testMode.enabled || settings.testMode.collideWithObstacles;
    if (collided && collisionEnabled) this.endRun();
  }

  // Renders the current score (distance traveled plus gem bonus) into the HUD.
  private updateScoreLabel(): void {
    if (!this.scoreLabel) return;
    this.scoreLabel.textContent = String(Math.floor(this.distance) + this.gemScore);
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

  // Swaps the "loading . . ." text for the start button, once sound effects are ready.
  private showStartButton(): void {
    this.introStatusLabel?.classList.add("hidden");
    this.startButton?.classList.remove("hidden");
    this.previewStarted = true;
  }

  // Starts the pre-game countdown once the player clicks Start.
  private beginCountdown(): void {
    if (this.state !== "intro") return;
    this.state = "countdown";
    this.sound.startMusic();
    this.introTitle?.classList.add("hidden");
    this.startButton?.classList.add("hidden");
    this.introStatusLabel?.classList.add("countdown");
    this.countdownRemaining = COUNTDOWN_SECONDS;
    this.updateCountdownLabel();
    this.countdownIntervalId = window.setInterval(() => this.tickCountdown(), 1000);
  }

  // Counts the intro overlay down by one second, starting the run once it reaches zero.
  private tickCountdown(): void {
    this.countdownRemaining -= 1;
    if (this.countdownRemaining <= 0) {
      window.clearInterval(this.countdownIntervalId);
      this.introOverlay?.classList.add("hidden");
      this.obstacles?.setVisible(true);
      this.collectibles?.setVisible(true);
      this.state = "running";
      return;
    }
    this.updateCountdownLabel();
  }

  // Renders the remaining countdown seconds into the intro overlay.
  private updateCountdownLabel(): void {
    if (!this.introStatusLabel) return;
    this.introStatusLabel.classList.remove("hidden");
    this.introStatusLabel.textContent = String(this.countdownRemaining);
  }

  // Switches to the game-over state and shatters the player, revealing the overlay after a delay.
  private endRun(): void {
    this.state = "gameover";
    this.explosion.trigger(this.player.mesh);
    this.sound.playObstacleCollision();
    this.player.mesh.isVisible = false;
    this.gameOverTimeoutId = window.setTimeout(() => this.showGameOverOverlay(), GAME_OVER_DELAY_MS);
  }

  // Shows the final score overlay, once the post-collision delay has elapsed.
  private showGameOverOverlay(): void {
    if (this.finalScoreLabel) this.finalScoreLabel.textContent = this.scoreLabel?.textContent ?? "0";
    this.gameOverOverlay?.classList.remove("hidden");
  }

  // Resets score, systems, and state so a new run starts from scratch.
  private restart(): void {
    window.clearTimeout(this.gameOverTimeoutId);
    this.elapsedSeconds = 0;
    this.distance = 0;
    this.gemScore = 0;
    this.gemsCollected = 0;
    this.updateScoreLabel();
    this.updateGemCountLabel();
    this.updateTimerLabel();
    this.updateSpeedLabel(settings.baseSpeed);
    this.gameOverOverlay?.classList.add("hidden");

    this.player.reset();
    this.player.mesh.isVisible = true;
    this.starField.reset();
    this.track.reset();
    this.obstacles?.reset();
    this.collectibles?.reset(this.obstacles?.positions ?? []);
    this.explosion.reset();

    this.state = "running";
  }
}
