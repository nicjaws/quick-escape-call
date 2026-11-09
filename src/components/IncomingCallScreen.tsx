import { Phone, MessageSquare, Voicemail, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startRingtone } from "@/lib/ringtone";

interface IncomingCallScreenProps {
  callerName: string;
  callerPhoto?: string;
  locked?: boolean;
  ringtone?: "classic" | "custom";
  animateEntrance?: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onTimeout?: () => void;
}

export default function IncomingCallScreen({
  callerName,
  callerPhoto,
  locked = false,
  ringtone = "classic",
  animateEntrance = true,
  onAnswer,
  onDecline,
  onTimeout,
}: IncomingCallScreenProps) {
  const [slide, setSlide] = useState(0); // 0..1 for locked slide-to-answer
  const dragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stopSound = startRingtone(ringtone);
    const vibrateInterval = navigator.vibrate ? window.setInterval(() => navigator.vibrate([500, 300, 500]), 3000) : undefined;
    return () => {
      stopSound();
      window.clearInterval(vibrateInterval);
      navigator.vibrate?.(0);
    };
  }, [ringtone]);

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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-black text-white ${animateEntrance ? "animate-slide-up" : ""}`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        ...bgStyle,
      }}
    >
      {/* Subtle dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Caller info */}
      <div className="relative flex flex-col items-center pt-10 gap-1">
        <h1 className="text-[40px] leading-tight font-normal tracking-tight text-white text-center px-6">{callerName}</h1>
        <p className="text-white/60 text-lg">móvil</p>
      </div>

      {/* Bottom controls */}
      <div className="relative w-full px-8 pb-6 flex flex-col items-center gap-6">
        {/* Mensaje / Buzón */}
        <div className="w-full flex items-center justify-between px-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white">Mensaje</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
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
              <Phone className="w-6 h-6 text-call-green" fill="currentColor" strokeWidth={0} />
            </button>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          </div>
        ) : (
          // Decline + Accept circular buttons
          <div className="w-full flex items-center justify-between px-4 pt-4">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onDecline}
                aria-label="Rechazar"
                className="w-[76px] h-[76px] rounded-full bg-call-red flex items-center justify-center active:brightness-90"
              >
                <Phone className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" strokeWidth={0} />
              </button>
              <span className="text-sm text-white">Rechazar</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAnswer}
                aria-label="Aceptar"
                className="w-[76px] h-[76px] rounded-full bg-call-green flex items-center justify-center active:brightness-90"
              >
                <Phone className="w-8 h-8 text-white" fill="currentColor" strokeWidth={0} />
              </button>
              <span className="text-sm text-white">Aceptar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}