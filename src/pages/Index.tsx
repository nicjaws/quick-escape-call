import { useState, useEffect, useCallback } from "react";
import { Settings, Phone, Watch, Shield } from "lucide-react";
import { useCallSettings } from "@/hooks/useCallSettings";
import SettingsPanel from "@/components/SettingsPanel";
import IncomingCallScreen from "@/components/IncomingCallScreen";
import ActiveCallScreen from "@/components/ActiveCallScreen";

type AppState = "idle" | "armed" | "countdown" | "ringing" | "active";

const Index = () => {
  const { settings, setSettings } = useCallSettings();
  const [state, setState] = useState<AppState>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  // Simulate watch trigger: 4 rapid taps on the shield icon
  const handleWatchTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 600) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 3 && state === "idle") {
        setState("countdown");
        setCountdown(settings.delaySeconds);
        setTapCount(0);
      }
    } else {
      setTapCount(0);
    }
    setLastTap(now);
  }, [lastTap, tapCount, state, settings.delaySeconds]);

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

  if (state === "ringing") {
    return (
      <IncomingCallScreen
        callerName={settings.callerName}
        callerLabel={settings.callerLabel}
        onAnswer={answerCall}
        onDecline={hangUp}
      />
    );
  }

  if (state === "active") {
    return <ActiveCallScreen callerName={settings.callerName} onHangUp={hangUp} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-foreground">FakeCall</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {showSettings ? (
          <div className="w-full max-w-sm animate-slide-up">
            <h2 className="text-lg font-medium text-foreground mb-6">Configuración</h2>
            <SettingsPanel settings={settings} onChange={setSettings} />
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform"
            >
              Guardar
            </button>
          </div>
        ) : state === "countdown" ? (
          <div className="flex flex-col items-center gap-6 animate-slide-up">
            <div className="w-32 h-32 rounded-full border-4 border-call-green flex items-center justify-center">
              <span className="text-5xl font-light text-call-green">{countdown}</span>
            </div>
            <p className="text-muted-foreground text-center">
              Llamada entrante de <span className="text-foreground font-medium">{settings.callerName}</span>
            </p>
            <button
              onClick={cancelCall}
              className="px-8 py-3 rounded-xl bg-call-red text-primary-foreground font-medium active:scale-[0.98] transition-transform"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            {/* Watch trigger simulation */}
            <button
              onClick={handleWatchTap}
              className="w-28 h-28 rounded-full bg-secondary border-2 border-border flex items-center justify-center active:scale-95 transition-transform select-none"
            >
              <Watch className="w-12 h-12 text-muted-foreground" />
            </button>
            <p className="text-muted-foreground text-sm text-center max-w-[250px]">
              Toca 4 veces rápido para activar la llamada falsa
            </p>

            <div className="w-full max-w-xs border-t border-border pt-6 mt-2">
              <button
                onClick={triggerCall}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform"
              >
                <Phone className="w-5 h-5" />
                Activar llamada ({settings.delaySeconds}s)
              </button>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 bg-secondary rounded-xl p-4 max-w-xs">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configura el nombre y el retardo en ajustes. La llamada sonará de forma realista con vibración.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;