import { Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { ChaseCamera } from "./ChaseCamera";
import { CollectibleField } from "./Collectibles";
import { BASE_SPEED, MAX_SPEED, SPEED_RAMP } from "./constants";
import { ObstacleField } from "./Obstacles";
import { Player } from "./Player";
import { Track } from "./Track";

type RunState = "running" | "gameover";

const GEM_SCORE = 10;

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly track: Track;
  private readonly player: Player;
  private readonly obstacles: ObstacleField;
  private readonly collectibles: CollectibleField;
  private readonly camera: ChaseCamera;

  private readonly scoreLabel = document.getElementById("score");
  private readonly gameOverOverlay = document.getElementById("gameOver");
  private readonly finalScoreLabel = document.getElementById("finalScore");

  private state: RunState = "running";
  private elapsedSeconds = 0;
  private distance = 0;
  private gemScore = 0;

  /**
   * Builds the engine, scene, and all game systems, and wires up restart input.
   * @param canvas - The HTML canvas element Babylon renders into.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.07, 0.12, 1);

    new HemisphericLight("skyLight", new Vector3(0.2, 1, 0.1), this.scene);

    this.track = new Track(this.scene);
    this.player = new Player(this.scene);
    this.obstacles = new ObstacleField(this.scene);
    this.collectibles = new CollectibleField(this.scene);
    this.camera = new ChaseCamera(this.scene);

    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("keydown", (event) => {
      if (this.state === "gameover" && event.key.toLowerCase() === "r") this.restart();
    });
    document.getElementById("restartButton")?.addEventListener("click", () => this.restart());
  }

  // Starts Babylon's render loop, updating game state only while a run is active.
  run(): void {
    this.engine.runRenderLoop(() => {
      const deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      if (this.state === "running") this.update(deltaSeconds);
      this.scene.render();
    });
  }

  /**
   * Advances speed/distance and every game system for one frame, ending the run on collision.
   * @param deltaSeconds - Time elapsed since the last frame, in seconds.
   */
  private update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    const speed = Math.min(BASE_SPEED + this.elapsedSeconds * SPEED_RAMP, MAX_SPEED);
    this.distance += speed * deltaSeconds;

    this.player.update(deltaSeconds, speed);
    this.track.update(deltaSeconds, speed);
    const gemsCollected = this.collectibles.update(deltaSeconds, speed, this.player.mesh.position);
    const collided = this.obstacles.update(deltaSeconds, speed, this.player.mesh.position);
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

  // Switches to the game-over state and shows the final score overlay.
  private endRun(): void {
    this.state = "gameover";
    if (this.finalScoreLabel) this.finalScoreLabel.textContent = this.scoreLabel?.textContent ?? "0";
    this.gameOverOverlay?.classList.remove("hidden");
  }

  // Resets score, systems, and state so a new run starts from scratch.
  private restart(): void {
    this.elapsedSeconds = 0;
    this.distance = 0;
    this.gemScore = 0;
    this.updateScoreLabel();
    this.gameOverOverlay?.classList.add("hidden");

    this.player.reset();
    this.track.reset();
    this.obstacles.reset();
    this.collectibles.reset();

    this.state = "running";
  }
}
