import { useState, useEffect, useCallback } from "react";
import { Settings, Phone, Watch } from "lucide-react";
import { useCallSettings } from "@/hooks/useCallSettings";
import { useWatchTrigger } from "@/hooks/useWatchTrigger";
import SettingsPanel from "@/components/SettingsPanel";
import IncomingCallScreen from "@/components/IncomingCallScreen";
import ActiveCallScreen from "@/components/ActiveCallScreen";

type AppState = "idle" | "countdown" | "ringing" | "retry-wait" | "active";

export default function Index() {
  const { settings, setSettings } = useCallSettings();
  const [state, setState] = useState<AppState>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Disparo desde Apple Watch (plugin nativo)
  useWatchTrigger(() => {
    if (state === "idle") {
      setState("countdown");
      setCountdown(settings.delaySeconds);
    }
  });

  // Countdown timer
  useEffect(() => {
    if (state !== "countdown") return;
    if (countdown <= 0) {
      setState("ringing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown]);

  const triggerCall = () => {
    setState("countdown");
    setCountdown(settings.delaySeconds);
  };

  const cancelCall = () => {
    setState("idle");
    setCountdown(0);
  };

  const answerCall = () => setState("active");
  const hangUp = () => setState("idle");

  // Auto retry: si no contestan en 20s, espera 60s y vuelve a sonar
  useEffect(() => {
    if (state !== "retry-wait") return;
    const t = setTimeout(() => setState("ringing"), 60000);
    return () => clearTimeout(t);
  }, [state]);

  const handleRingTimeout = () => setState("retry-wait");

  if (state === "ringing") {
    return (
      <IncomingCallScreen
        callerName={settings.callerName}
        callerPhoto={settings.callerPhoto}
        locked={settings.lockedScreen}
        onAnswer={answerCall}
        onDecline={hangUp}
        onTimeout={handleRingTimeout}
      />
    );
  }

  if (state === "active") {
    return (
      <ActiveCallScreen
        callerName={settings.callerName}
        callerPhoto={settings.callerPhoto}
        onHangUp={hangUp}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header con ajustes */}
      <header className="flex items-center justify-end px-6 pt-12 pb-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Ajustes"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pb-12">
        {showSettings ? (
          /* Pantalla de ajustes */
          <div className="w-full max-w-sm flex flex-col gap-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Ajustes / Settings</h2>
            </div>
            <SettingsPanel settings={settings} onChange={setSettings} />
            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform"
            >
              Guardar / Save
            </button>
          </div>
        ) : state === "countdown" ? (
          /* Cuenta atrás */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-slide-up">
            <div className="w-36 h-36 rounded-full border-[6px] border-call-green flex items-center justify-center shadow-lg shadow-call-green/20">
              <span className="text-6xl font-light text-call-green tabular-nums">{countdown}</span>
            </div>
            <p className="text-muted-foreground text-center text-lg">
              Llamada de <span className="text-foreground font-semibold">{settings.callerName}</span>
            </p>
            <button
              onClick={cancelCall}
              className="px-10 py-3.5 rounded-2xl bg-call-red text-white font-medium text-base active:scale-[0.98] transition-transform shadow-lg shadow-call-red/25"
            >
              Cancelar / Cancel
            </button>
          </div>
        ) : state === "retry-wait" ? (
          /* Espera de reintento */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-slide-up">
            <div className="w-36 h-36 rounded-full border-[6px] border-call-blue flex items-center justify-center shadow-lg shadow-call-blue/20">
              <Phone className="w-12 h-12 text-call-blue" />
            </div>
            <p className="text-muted-foreground text-center text-lg max-w-[280px]">
              Reintentando en 1 minuto...
              <br />
              <span className="text-muted-foreground/60 text-base">Retrying in 1 minute…</span>
            </p>
            <button
              onClick={cancelCall}
              className="px-10 py-3.5 rounded-2xl bg-call-red text-white font-medium text-base active:scale-[0.98] transition-transform shadow-lg shadow-call-red/25"
            >
              Cancelar / Cancel
            </button>
          </div>
        ) : (
          /* Pantalla principal — simple y obvia */
          <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-sm">
            {/* Botón principal: activar llamada */}
            <button
              onClick={triggerCall}
              className="w-56 h-56 rounded-full bg-call-red flex items-center justify-center shadow-2xl shadow-call-red/30 active:scale-90 transition-transform duration-150"
              aria-label="Activar llamada falsa"
            >
              <Phone className="w-20 h-20 text-white" strokeWidth={1.5} />
            </button>

            <div className="text-center space-y-2">
              <p className="text-foreground text-xl font-semibold">
                {settings.callerName}
              </p>
              <p className="text-muted-foreground text-sm">
                Toca para llamada falsa / Tap for fake call
              </p>
            </div>

            {/* Indicador de Watch conectado (estético) */}
            <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
              <Watch className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                También desde Apple Watch / From Apple Watch too
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
