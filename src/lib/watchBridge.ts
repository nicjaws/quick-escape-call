import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface WatchTriggerEvent {
  requestId: string;
  expiresAt: number;
  /** True when the user tapped the fallback notification: skip the countdown. */
  immediate?: boolean;
}

interface WatchBridgePlugin {
  addListener(
    eventName: "trigger",
    listener: (event: WatchTriggerEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(eventName: "resume", listener: () => void): Promise<PluginListenerHandle>;
  getPendingNotificationTrigger(): Promise<{ trigger?: WatchTriggerEvent }>;
  completePresentation(options: { requestId?: string }): Promise<void>;
  acknowledgeTrigger(options: { requestId: string; accepted: boolean }): Promise<void>;
  syncSettings(options: { callerName: string; delaySeconds: number; useCustomRingtone?: boolean }): Promise<void>;
  installRingtone(options: { base64: string }): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
}

export const WatchBridge = registerPlugin<WatchBridgePlugin>("WatchBridge");
