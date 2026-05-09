import { Mic, MicOff, Volume2, Phone, Grid3x3, Plus, Video, User, Signal, Wifi, BatteryFull } from "lucide-react";
import { useState, useEffect } from "react";

interface ActiveCallScreenProps {
  callerName: string;
  onHangUp: () => void;
}

export default function ActiveCallScreen({ callerName, onHangUp }: ActiveCallScreenProps) {
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

  const now = new Date();
  const clock = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

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
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-colors ${
          active ? "bg-foreground text-background" : "bg-foreground/15 text-foreground"
        }`}
      >
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </button>
      <span className="text-xs text-foreground/90">{label}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background select-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 50px)",
        paddingBottom: "env(safe-area-inset-bottom, 30px)",
      }}
    >
      {/* iOS status bar */}
      <div className="flex items-center justify-between px-8 pt-1 text-foreground text-sm font-semibold">
        <span>{clock}</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-4 h-4" />
          <Wifi className="w-4 h-4" />
          <BatteryFull className="w-5 h-5" />
        </div>
      </div>

      {/* Caller info */}
      <div className="flex flex-col items-center pt-10 gap-2">
        <h1 className="text-[34px] font-light text-foreground leading-tight">{callerName}</h1>
        <p className="text-foreground/80 text-base">{formatTime(seconds)}</p>
      </div>

      <div className="flex-1" />

      {/* Action grid */}
      <div className="px-10 pb-8">
        <div className="grid grid-cols-3 gap-y-6 justify-items-center">
          <IconBtn
            icon={muted ? MicOff : Mic}
            label="silenciar"
            active={muted}
            onClick={() => setMuted(!muted)}
          />
          <IconBtn icon={Grid3x3} label="teclado" />
          <IconBtn
            icon={Volume2}
            label="audio"
            active={speaker}
            onClick={() => setSpeaker(!speaker)}
          />
          <IconBtn icon={Plus} label="añadir" />
          <IconBtn icon={Video} label="FaceTime" />
          <IconBtn icon={User} label="contactos" />
        </div>

        {/* Hang up */}
        <div className="flex justify-center mt-10">
          <button
            onClick={onHangUp}
            className="w-[72px] h-[72px] rounded-full bg-call-red flex items-center justify-center active:scale-95 transition-transform"
          >
            <Phone className="w-8 h-8 text-primary-foreground rotate-[135deg]" />
          </button>
        </div>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-1">
        <div className="w-32 h-[5px] rounded-full bg-foreground/80" />
      </div>
    </div>
  );
}