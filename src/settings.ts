import { load } from "js-yaml";
import settingsSource from "../settings.yml?raw";

interface Settings {
  wireframe: boolean;
}

export const settings = load(settingsSource) as Settings;
