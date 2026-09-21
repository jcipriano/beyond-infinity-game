import { load } from "js-yaml";
import settingsSource from "../settings.yml?raw";

interface TestModeSettings {
  enabled: boolean;
  spawn: "gems" | "obstacles" | "both";
  dimGameOver: boolean;
  collideWithObstacles: boolean;
}

interface SoundSettings {
  enabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

interface Settings {
  wireframe: boolean;
  opacity: number;
  edgeWidth: number;
  baseSpeed: number;
  maxSpeed: number;
  speedRamp: number;
  sound: SoundSettings;
  testMode: TestModeSettings;
}

export const settings = load(settingsSource) as Settings;
applyQueryStringOverrides(settings);

/**
 * Overrides settings values from the page's query string, so individual fields can be tweaked
 * without editing settings.yml. Nested fields use dot notation, e.g. `?testMode.enabled=true`.
 * @param target - The settings object to mutate in place.
 */
function applyQueryStringOverrides(target: Settings): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, rawValue] of params) {
    setNestedValue(target as unknown as Record<string, unknown>, key.split("."), rawValue);
  }
}

/**
 * Walks a dot-notation key path into an object and overwrites the value at the end of it,
 * coercing the raw string to match the existing value's type (boolean/number/string).
 * @param target - The object to walk into.
 * @param path - The remaining key path segments to descend through.
 * @param rawValue - The raw query string value to coerce and assign.
 */
function setNestedValue(target: Record<string, unknown>, path: string[], rawValue: string): void {
  const [key, ...rest] = path;
  if (rest.length > 0) {
    const child = target[key];
    if (typeof child === "object" && child !== null) {
      setNestedValue(child as Record<string, unknown>, rest, rawValue);
    }
    return;
  }

  const currentValue = target[key];
  if (typeof currentValue === "boolean") target[key] = rawValue === "true";
  else if (typeof currentValue === "number") target[key] = Number(rawValue);
  else target[key] = rawValue;
}
