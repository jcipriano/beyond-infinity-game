const COUNTDOWN_SECONDS = 3;

export class IntroScreen {
  private readonly overlay = document.getElementById("intro");
  private readonly title = document.getElementById("introTitle");
  private readonly statusLabel = document.getElementById("introStatus");
  private readonly startButton = document.getElementById("startButton");

  private countdownRemaining = COUNTDOWN_SECONDS;
  private countdownIntervalId: number | undefined;

  /**
   * Wires up the start button and Enter key, ready to reveal the button once shown.
   * @param onStartClicked - Called the instant the player starts the countdown, on the same
   * user gesture (e.g. so music can start immediately without being blocked by autoplay rules).
   * @param onCountdownComplete - Called once the countdown reaches zero and the overlay hides.
   */
  constructor(
    private readonly onStartClicked: () => void,
    private readonly onCountdownComplete: () => void
  ) {
    this.startButton?.addEventListener("click", () => this.beginCountdown());
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "enter") return;
      if (!this.startButton?.classList.contains("hidden")) this.beginCountdown();
    });
  }

  // Swaps the "loading . . ." text for the start button, once assets are ready.
  showStartButton(): void {
    this.statusLabel?.classList.add("hidden");
    this.startButton?.classList.remove("hidden");
  }

  // Starts the pre-game countdown once the player clicks Start (or presses Enter).
  private beginCountdown(): void {
    if (!this.startButton || this.startButton.classList.contains("hidden")) return;
    this.onStartClicked();
    this.title?.classList.add("hidden");
    this.startButton.classList.add("hidden");
    this.statusLabel?.classList.add("countdown");
    this.countdownRemaining = COUNTDOWN_SECONDS;
    this.updateCountdownLabel();
    this.countdownIntervalId = window.setInterval(() => this.tickCountdown(), 1000);
  }

  // Counts the overlay down by one second, hiding it and notifying once it reaches zero.
  private tickCountdown(): void {
    this.countdownRemaining -= 1;
    if (this.countdownRemaining <= 0) {
      window.clearInterval(this.countdownIntervalId);
      this.overlay?.classList.add("hidden");
      this.onCountdownComplete();
      return;
    }
    this.updateCountdownLabel();
  }

  // Renders the remaining countdown seconds into the overlay.
  private updateCountdownLabel(): void {
    if (!this.statusLabel) return;
    this.statusLabel.classList.remove("hidden");
    this.statusLabel.textContent = String(this.countdownRemaining);
  }
}
