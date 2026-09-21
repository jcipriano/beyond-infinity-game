import { Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { ChaseCamera } from "./ChaseCamera";
import { CollectibleField } from "./Collectibles";
import { Explosion } from "./Explosion";
import { ObstacleField } from "./Obstacles";
import { Player } from "./Player";
import { StarField } from "./StarField";
import { Track } from "./Track";
import { settings } from "../settings";

type RunState = "running" | "gameover";

const GEM_SCORE = 10;
const GAME_OVER_DELAY_MS = 1000;

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

  private readonly scoreLabel = document.getElementById("score");
  private readonly timerLabel = document.getElementById("timer");
  private readonly speedLabel = document.getElementById("speed");
  private readonly gameOverOverlay = document.getElementById("gameOver");
  private readonly finalScoreLabel = document.getElementById("finalScore");

  private state: RunState = "running";
  private elapsedSeconds = 0;
  private distance = 0;
  private gemScore = 0;
  private gameOverTimeoutId: number | undefined;

  /**
   * Builds the engine, scene, and all game systems, and wires up restart input.
   * @param canvas - The HTML canvas element Babylon renders into.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true });
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
    this.camera = new ChaseCamera(this.scene);
    this.explosion = new Explosion(this.scene);

    if (settings.testMode.enabled && !settings.testMode.dimGameOver) {
      this.gameOverOverlay?.classList.add("noDim");
    }

    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "r") return;
      if (this.state === "gameover" && !this.gameOverOverlay?.classList.contains("hidden")) this.restart();
    });
    document.getElementById("restartButton")?.addEventListener("click", () => this.restart());
  }

  // Starts Babylon's render loop, updating game state only while a run is active.
  run(): void {
    this.engine.runRenderLoop(() => {
      const deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      if (this.state === "running") this.update(deltaSeconds);
      this.explosion.update(deltaSeconds);
      this.scene.render();
    });
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
    const gemsCollected =
      this.collectibles?.update(deltaSeconds, speed, this.player.mesh.position, this.obstacles?.positions ?? []) ?? 0;
    const collided =
      this.obstacles?.update(deltaSeconds, speed, this.player.mesh.position, this.collectibles?.positions ?? []) ??
      false;
    this.camera.update(this.player.mesh.position, deltaSeconds);

    this.gemScore += gemsCollected * GEM_SCORE;
    this.updateScoreLabel();

    if (collided) this.endRun();
  }

  // Renders the current score (distance traveled plus gem bonus) into the HUD.
  private updateScoreLabel(): void {
    if (!this.scoreLabel) return;
    this.scoreLabel.textContent = String(Math.floor(this.distance) + this.gemScore);
  }

  // Renders elapsed run time as minutes:seconds.tenths into the HUD.
  private updateTimerLabel(): void {
    if (!this.timerLabel) return;
    const totalSeconds = Math.floor(this.elapsedSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((this.elapsedSeconds - totalSeconds) * 10);
    this.timerLabel.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
  }

  /**
   * Renders the current forward speed into the HUD.
   * @param speed - Current forward speed in units per second.
   */
  private updateSpeedLabel(speed: number): void {
    if (!this.speedLabel) return;
    this.speedLabel.textContent = `Speed: ${Math.round(speed)}`;
  }

  // Switches to the game-over state and shatters the player, revealing the overlay after a delay.
  private endRun(): void {
    this.state = "gameover";
    this.explosion.trigger(this.player.mesh);
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
    this.updateScoreLabel();
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
