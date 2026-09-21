import { load } from "js-yaml";
import settingsSource from "../settings.yml?raw";

interface TestModeSettings {
  enabled: boolean;
  spawn: "gems" | "obstacles" | "both";
  dimGameOver: boolean;
}

interface Settings {
  wireframe: boolean;
  opacity: number;
  edgeWidth: number;
  baseSpeed: number;
  maxSpeed: number;
  speedRamp: number;
  testMode: TestModeSettings;
}

export const settings = load(settingsSource) as Settings;
