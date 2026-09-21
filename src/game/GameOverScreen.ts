import { settings } from "../settings";

export class GameOverScreen {
  private readonly overlay = document.getElementById("gameOver");
  private readonly finalScoreLabel = document.getElementById("finalScore");

  /**
   * Wires up the restart button and R key, and applies test mode's "no dim" style if configured.
   * @param onRestart - Called when the player restarts, via the button or the R key.
   */
  constructor(private readonly onRestart: () => void) {
    if (settings.testMode.enabled && !settings.testMode.dimGameOver) {
      this.overlay?.classList.add("noDim");
    }

    document.getElementById("restartButton")?.addEventListener("click", () => this.onRestart());
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "r") return;
      if (!this.overlay?.classList.contains("hidden")) this.onRestart();
    });
  }

  /**
   * Reveals the overlay with the given final score.
   * @param score - The final score text to display.
   */
  show(score: string): void {
    if (this.finalScoreLabel) this.finalScoreLabel.textContent = score;
    this.overlay?.classList.remove("hidden");
  }

  // Hides the overlay for a new run.
  hide(): void {
    this.overlay?.classList.add("hidden");
  }
}
