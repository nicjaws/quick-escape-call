import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface WatchTriggerEvent {
  requestId: string;
}

interface WatchBridgePlugin {
  addListener(
    eventName: "trigger",
    listener: (event: WatchTriggerEvent) => void,
  ): Promise<PluginListenerHandle>;
  acknowledgeTrigger(options: { requestId: string; accepted: boolean }): Promise<void>;
}

export const WatchBridge = registerPlugin<WatchBridgePlugin>("WatchBridge");