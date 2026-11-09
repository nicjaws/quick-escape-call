import { useEffect, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { WatchBridge, type WatchTriggerEvent } from "@/lib/watchBridge";

/**
 * The native listener retains early Watch messages until React is ready.
 * The window event remains available for the existing simulation button.
 * `immediate` events (fallback notification taps) skip the countdown.
 */
export function useWatchTrigger(onTrigger: (immediate?: boolean) => boolean | void) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;
  const [presentationReady, setPresentationReady] = useState(() => Capacitor.getPlatform() !== "ios");
  const [notificationRequestId, setNotificationRequestId] = useState<string>();
  const [resumeVersion, setResumeVersion] = useState(0);

  useEffect(() => {
    let disposed = false;
    const listeners: PluginListenerHandle[] = [];
    const results = new Map<string, boolean>();
    const handler = () => onTriggerRef.current();
    window.addEventListener("fakecall:trigger", handler);

    const receiveTrigger = (event: WatchTriggerEvent) => {
      if (disposed || !event.requestId) return;
      if (event.immediate) setNotificationRequestId(event.requestId);
      // Stale retained event (e.g. the app was woken in the background hours
      // ago): ignore it silently so no surprise call starts and the fallback
      // notification, if still pending, stays scheduled.
      if (event.expiresAt <= Date.now()) return;
      // App in background: iOS cannot bring it to the front, so let the
      // native fallback notification ring instead of playing audio unseen.
      if (!event.immediate && typeof document !== "undefined" && document.visibilityState === "hidden") return;
      // A notification tap upgrades a pending countdown from the same request.
      const deliveryKey = `${event.requestId}:${event.immediate === true}`;
      let accepted = results.get(deliveryKey);
      if (accepted === undefined) {
        accepted = onTriggerRef.current(event.immediate === true) !== false;
        results.set(deliveryKey, accepted);
        if (results.size > 32) {
          const oldest = results.keys().next().value;
          if (oldest !== undefined) results.delete(oldest);
        }
      }
      void WatchBridge.acknowledgeTrigger({ requestId: event.requestId, accepted })
        .catch((error: unknown) => console.error("Watch acknowledgement failed:", error));
    };

    if (Capacitor.getPlatform() === "ios") {
      const checkPresentation = async () => {
        if (disposed) return;
        setPresentationReady(false);
        try {
          const { trigger } = await WatchBridge.getPendingNotificationTrigger();
          if (disposed) return;
          if (trigger) receiveTrigger(trigger);
          setPresentationReady(true);
          setResumeVersion((version) => version + 1);
        } catch (error) {
          if (!disposed) setPresentationReady(true);
          console.error("Watch presentation check failed:", error);
        }
      };
      const retainListener = (handle: PluginListenerHandle) => {
          if (disposed) {
            void handle.remove().catch((error: unknown) => console.error("Watch listener cleanup failed:", error));
          } else {
            listeners.push(handle);
          }
      };
      void Promise.all([
        WatchBridge.addListener("trigger", receiveTrigger).then(retainListener),
        WatchBridge.addListener("resume", () => { void checkPresentation(); }).then(retainListener),
      ]).then(checkPresentation)
        .catch((error: unknown) => console.error("WatchBridge is unavailable:", error));
    }

    const testWindow = window as Window & { __fakeCallTrigger?: () => boolean | void };
    testWindow.__fakeCallTrigger = handler;

    return () => {
      disposed = true;
      window.removeEventListener("fakecall:trigger", handler);
      if (testWindow.__fakeCallTrigger === handler) delete testWindow.__fakeCallTrigger;
      for (const listener of listeners) {
        void listener.remove().catch((error: unknown) => console.error("Watch listener cleanup failed:", error));
      }
    };
  }, []);

  return { presentationReady, notificationRequestId, resumeVersion };
}
