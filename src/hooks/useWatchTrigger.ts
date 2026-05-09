import { useEffect } from "react";

/**
 * Escucha el evento "fakecall:trigger" que emite el plugin nativo
 * cuando el Apple Watch envía la señal (4 toques en la corona).
 *
 * Desde Swift se dispara llamando a:
 *   bridge?.triggerJSEvent("fakecall:trigger", "window")
 */
export function useWatchTrigger(onTrigger: () => void) {
  useEffect(() => {
    const handler = () => onTrigger();
    window.addEventListener("fakecall:trigger", handler);

    // Útil también para pruebas desde la consola: window.__fakeCallTrigger()
    (window as unknown as { __fakeCallTrigger?: () => void }).__fakeCallTrigger = onTrigger;

    return () => {
      window.removeEventListener("fakecall:trigger", handler);
    };
  }, [onTrigger]);
}
