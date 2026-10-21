import { useEffect, useRef } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { WatchBridge, type WatchTriggerEvent } from "@/lib/watchBridge";

/**
 * The native listener retains early Watch messages until React is ready.
 * The window event remains available for the existing simulation button.
 */
export function useWatchTrigger(onTrigger: () => boolean | void) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    const results = new Map<string, boolean>();
    const handler = () => onTriggerRef.current();
    window.addEventListener("fakecall:trigger", handler);

    const receiveTrigger = (event: WatchTriggerEvent) => {
      if (disposed || !event.requestId) return;
      let accepted = results.get(event.requestId);
      if (accepted === undefined) {
        accepted = onTriggerRef.current() !== false;
        results.set(event.requestId, accepted);
        if (results.size > 32) {
          const oldest = results.keys().next().value;
          if (oldest !== undefined) results.delete(oldest);
        }
      }
      void WatchBridge.acknowledgeTrigger({ requestId: event.requestId, accepted })
        .catch((error: unknown) => console.error("Watch acknowledgement failed:", error));
    };

    if (Capacitor.getPlatform() === "ios") {
      void WatchBridge.addListener("trigger", receiveTrigger)
        .then((handle) => {
          if (disposed) {
            void handle.remove().catch((error: unknown) => console.error("Watch listener cleanup failed:", error));
          } else {
            listener = handle;
          }
        })
        .catch((error: unknown) => console.error("WatchBridge is unavailable:", error));
    }

    const testWindow = window as Window & { __fakeCallTrigger?: () => boolean | void };
    testWindow.__fakeCallTrigger = handler;

    return () => {
      disposed = true;
      window.removeEventListener("fakecall:trigger", handler);
      if (testWindow.__fakeCallTrigger === handler) delete testWindow.__fakeCallTrigger;
      void listener?.remove().catch((error: unknown) => console.error("Watch listener cleanup failed:", error));
    };
  }, []);
}
