import { Mic, MicOff, Volume2, Phone, Grid3x3, Video, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

interface ActiveCallScreenProps {
  callerName: string;
  callerPhoto?: string;
  onHangUp: () => void;
}

export default function ActiveCallScreen({ callerName, callerPhoto, onHangUp }: ActiveCallScreenProps) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const IconBtn = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: typeof Mic;
    label: string;
    active?: boolean;
    onClick?: () => void;
  }) => (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={`w-[68px] h-[68px] rounded-full flex items-center justify-center transition-colors backdrop-blur ${
          active ? "bg-white text-black" : "bg-white/20 text-white"
        }`}
      >
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </button>
      <span className="text-xs text-white">{label}</span>
    </div>
  );

  const bgStyle = callerPhoto
    ? { backgroundImage: `url(${callerPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black select-none text-white"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        ...bgStyle,
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Caller info */}
      <div className="relative flex flex-col items-center pt-8 gap-1">
        <p className="text-call-blue text-xl font-light">{formatTime(seconds)}</p>
        <h1 className="text-[64px] leading-none font-light text-call-blue">{callerName}</h1>
      </div>

      <div className="flex-1" />

      {/* Action grid */}
      <div className="relative px-8 pb-8">
        <div className="grid grid-cols-3 gap-y-6 justify-items-center">
          <IconBtn
            icon={Volume2}
            label="Altavoz"
            active={speaker}
            onClick={() => setSpeaker(!speaker)}
          />
          <IconBtn icon={Video} label="FaceTime" />
          <IconBtn
            icon={muted ? MicOff : Mic}
            label="Silenciar"
            active={muted}
            onClick={() => setMuted(!muted)}
          />
          <IconBtn icon={MoreHorizontal} label="Más" />
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onHangUp}
              className="w-[68px] h-[68px] rounded-full bg-call-red flex items-center justify-center active:scale-95 transition-transform"
            >
              <Phone className="w-7 h-7 text-white rotate-[135deg]" />
            </button>
            <span className="text-xs text-white">Finalizar</span>
          </div>
          <IconBtn icon={Grid3x3} label="Teclado" />
        </div>
      </div>
    </div>
  );
}