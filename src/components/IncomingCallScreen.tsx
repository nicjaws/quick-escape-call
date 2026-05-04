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
    // Use Web Audio API to create a ringtone-like sound
    const ctx = new AudioContext();
    let stopped = false;

    const playRing = async () => {
      while (!stopped) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.start();
        await new Promise((r) => setTimeout(r, 400));
        osc.stop();
        await new Promise((r) => setTimeout(r, 200));
        if (stopped) break;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 480;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        await new Promise((r) => setTimeout(r, 400));
        osc2.stop();
        await new Promise((r) => setTimeout(r, 2000));
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