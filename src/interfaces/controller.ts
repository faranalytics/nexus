import { EventEmitter } from "node:events";
import { VoIPEvents } from "./voip.js";

export interface ControllerEvents {
  "init": [EventEmitter<VoIPEvents>]
}