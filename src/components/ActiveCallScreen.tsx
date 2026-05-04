import { Mic, MicOff, Volume2, Phone } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background"
      style={{ paddingTop: "env(safe-area-inset-top, 60px)", paddingBottom: "env(safe-area-inset-bottom, 40px)" }}
    >
      <div className="flex flex-col items-center pt-16 gap-2">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-2">
          <span className="text-2xl font-semibold text-foreground">
            {callerName.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl font-light text-foreground">{callerName}</h1>
        <p className="text-call-green text-sm font-medium">{formatTime(seconds)}</p>
      </div>

      <div className="flex flex-col items-center gap-10 pb-12">
        <div className="flex gap-12">
          <button
            onClick={() => setMuted(!muted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              muted ? "bg-foreground/20" : "bg-secondary"
            }`}
          >
            {muted ? <MicOff className="w-6 h-6 text-foreground" /> : <Mic className="w-6 h-6 text-foreground" />}
          </button>
          <button
            onClick={() => setSpeaker(!speaker)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              speaker ? "bg-foreground/20" : "bg-secondary"
            }`}
          >
            <Volume2 className="w-6 h-6 text-foreground" />
          </button>
        </div>
        <button
          onClick={onHangUp}
          className="w-16 h-16 rounded-full bg-call-red flex items-center justify-center active:scale-95 transition-transform"
        >
          <Phone className="w-7 h-7 text-primary-foreground rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}