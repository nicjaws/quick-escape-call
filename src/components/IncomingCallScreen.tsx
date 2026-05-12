import { Phone, PhoneOff, MessageSquare, Voicemail, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface IncomingCallScreenProps {
  callerName: string;
  callerLabel: string;
  callerPhoto?: string;
  locked?: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onTimeout?: () => void;
}

export default function IncomingCallScreen({
  callerName,
  callerLabel,
  callerPhoto,
  locked = false,
  onAnswer,
  onDecline,
  onTimeout,
}: IncomingCallScreenProps) {
  const [slide, setSlide] = useState(0); // 0..1 for locked slide-to-answer
  const dragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

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

  // Auto timeout (e.g. 20s) if user doesn't answer
  useEffect(() => {
    if (!onTimeout) return;
    const t = setTimeout(() => onTimeout(), 20000);
    return () => clearTimeout(t);
  }, [onTimeout]);

  // Slide-to-answer (locked screen)
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current) return;
    const w = trackRef.current.clientWidth - 64;
    const dx = Math.max(0, Math.min(w, e.clientX - startX.current));
    setSlide(dx / w);
  };
  const onPointerUp = () => {
    dragging.current = false;
    if (slide > 0.85) {
      onAnswer();
    } else {
      setSlide(0);
    }
  };

  const bgStyle = callerPhoto
    ? { backgroundImage: `url(${callerPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black animate-slide-up text-white"
      style={{
        paddingTop: "env(safe-area-inset-top, 60px)",
        paddingBottom: "env(safe-area-inset-bottom, 40px)",
        ...bgStyle,
      }}
    >
      {/* Subtle dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Caller info */}
      <div className="relative flex flex-col items-center pt-10 gap-1">
        <p className="text-call-blue text-2xl font-light">{callerLabel}</p>
        <h1 className="text-[64px] leading-none font-light text-call-blue">{callerName}</h1>
      </div>

      {/* Bottom controls */}
      <div className="relative w-full px-8 pb-6 flex flex-col items-center gap-6">
        {/* Mensaje / Buzón */}
        <div className="w-full flex items-center justify-between px-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white">Mensaje</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
              <Voicemail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white">Buzón de voz</span>
          </div>
        </div>

        {locked ? (
          // Slide to answer
          <div
            ref={trackRef}
            className="relative w-full h-16 rounded-full bg-white/15 backdrop-blur overflow-hidden"
          >
            <span className="absolute inset-0 flex items-center justify-center text-white/70 text-base pointer-events-none">
              Contestar
            </span>
            <button
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ transform: `translateX(${slide * 100}%)` }}
              className="absolute left-1 top-1 w-14 h-14 rounded-full bg-white flex items-center justify-center touch-none"
            >
              <Phone className="w-6 h-6 text-call-green" />
            </button>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          </div>
        ) : (
          // Decline + Accept circular buttons
          <div className="w-full flex items-center justify-between px-4 pt-4">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-call-red flex items-center justify-center active:scale-95 transition-transform"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs text-white">Rechazar</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAnswer}
                className="w-16 h-16 rounded-full bg-call-green flex items-center justify-center active:scale-95 transition-transform"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs text-white">Aceptar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}