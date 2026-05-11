import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface IncomingCallScreenProps {
  callerName: string;
  callerLabel: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallScreen({
  callerName,
  callerLabel,
  onAnswer,
  onDecline,
}: IncomingCallScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    let stopped = false;

    // Classic "Old Phone" bell ringtone: dual-tone (440 + 480 Hz)
    // with a 20 Hz tremolo, 2s ON / 4s OFF cadence (US bell standard).
    const playBell = (durationMs: number) => {
      const now = ctx.currentTime;
      const dur = durationMs / 1000;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      // Tremolo: ~20 Hz amplitude modulation gives the bell "warble"
      const tremolo = ctx.createOscillator();
      tremolo.type = "sine";
      tremolo.frequency.value = 20;
      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.25;
      tremolo.connect(tremoloGain);

      const gain = ctx.createGain();
      tremoloGain.connect(gain.gain);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
      gain.gain.setValueAtTime(0.35, now + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      tremolo.start(now);
      osc1.stop(now + dur);
      osc2.stop(now + dur);
      tremolo.stop(now + dur);
    };

    const playRing = async () => {
      while (!stopped) {
        playBell(2000);
        await new Promise((r) => setTimeout(r, 2000));
        if (stopped) break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    };

    playRing();

    // Vibrate if supported
    if (navigator.vibrate) {
      const vibrateInterval = setInterval(() => {
        navigator.vibrate([500, 300, 500]);
      }, 3000);
      return () => {
        stopped = true;
        ctx.close();
        clearInterval(vibrateInterval);
        navigator.vibrate(0);
      };
    }

    return () => {
      stopped = true;
      ctx.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background animate-slide-up"
      style={{ paddingTop: "env(safe-area-inset-top, 60px)", paddingBottom: "env(safe-area-inset-bottom, 40px)" }}
    >
      {/* Top section */}
      <div className="flex flex-col items-center pt-16 gap-2">
        {/* Avatar circle */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-3xl font-semibold text-foreground">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-call-green animate-pulse-ring" />
        </div>
        <h1 className="text-3xl font-light text-foreground">{callerName}</h1>
        <p className="text-muted-foreground text-lg">{callerLabel}</p>
      </div>

      {/* Bottom buttons */}
      <div className="flex items-center justify-around w-full max-w-xs pb-12">
        <button
          onClick={onDecline}
          className="w-16 h-16 rounded-full bg-call-red flex items-center justify-center active:scale-95 transition-transform"
        >
          <PhoneOff className="w-7 h-7 text-primary-foreground" />
        </button>
        <button
          onClick={onAnswer}
          className="w-16 h-16 rounded-full bg-call-green flex items-center justify-center active:scale-95 transition-transform"
        >
          <Phone className="w-7 h-7 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}