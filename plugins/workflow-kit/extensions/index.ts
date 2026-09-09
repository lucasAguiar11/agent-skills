import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { registerEfficiency } from "./efficiency";

export default function workflowKit(pi: ExtensionAPI): void {
  registerEfficiency(pi);
}
