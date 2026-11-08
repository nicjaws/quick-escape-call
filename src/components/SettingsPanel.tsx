import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Play, Square, Music2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { WatchBridge } from "@/lib/watchBridge";
import { preparePersonalRingtone, savePersonalRingtone, startRingtone } from "@/lib/ringtone";
import type { CallSettings } from "@/hooks/useCallSettings";

interface SettingsPanelProps {
  settings: CallSettings;
  onChange: (settings: CallSettings) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const stopPreview = useRef<(() => void) | undefined>();
  const previewTimer = useRef<number | undefined>();
  const [importing, setImporting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    stopPreview.current?.();
    stopPreview.current = undefined;
    window.clearTimeout(previewTimer.current);
    setPlaying(false);
  };
  useEffect(() => () => {
    stopPreview.current?.();
    window.clearTimeout(previewTimer.current);
  }, []);

  const handleAudio = async (file: File) => {
    stop();
    setError("");
    setImporting(true);
    try {
      const tone = await preparePersonalRingtone(file);
      await savePersonalRingtone(tone);
      if (Capacitor.getPlatform() === "ios") {
        await WatchBridge.installRingtone({ base64: tone.dataUrl.split(",")[1] });
      }
      onChange({ ...settings, ringtone: "custom", ringtoneLabel: tone.name });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo importar / Import failed");
    } finally { setImporting(false); }
  };

  const preview = () => {
    if (playing) { stop(); return; }
    setError("");
    setPlaying(true);
    stopPreview.current = startRingtone(settings.ringtone, () => {
      setError("No se pudo reproducir / Playback unavailable");
      stop();
    });
    previewTimer.current = window.setTimeout(stop, 20000);
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange({ ...settings, callerPhoto: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Foto del contacto / Contact photo
        </Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0"
          >
            {settings.callerPhoto ? (
              <img src={settings.callerPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
          <div className="flex-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm"
            >
              {settings.callerPhoto ? "Cambiar foto" : "Subir foto"}
            </button>
            {settings.callerPhoto && (
              <button
                type="button"
                onClick={() => onChange({ ...settings, callerPhoto: undefined })}
                className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> Quitar
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="callerName" className="text-muted-foreground text-xs uppercase tracking-wider">
          Nombre del contacto / Contact name
        </Label>
        <Input
          id="callerName"
          value={settings.callerName}
          onChange={(e) => onChange({ ...settings, callerName: e.target.value })}
          placeholder="Ej: Trabajo, Mamá, Jefe..."
          className="bg-secondary border-border text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delay" className="text-muted-foreground text-xs uppercase tracking-wider">
          Retardo (segundos) / Delay (seconds)
        </Label>
        <Input
          id="delay"
          type="number"
          min={5}
          max={120}
          value={settings.delaySeconds}
          onChange={(e) => onChange({ ...settings, delaySeconds: Number(e.target.value) })}
          className="bg-secondary border-border text-foreground"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="ringtone" className="text-muted-foreground text-xs uppercase tracking-wider">
          Tono de llamada / Ringtone
        </Label>
        <div className="flex items-center gap-2">
          <select
            id="ringtone"
            value={settings.ringtone ?? "classic"}
            disabled={importing}
            onChange={(event) => {
              stop();
              onChange({ ...settings, ringtone: event.target.value === "custom" ? "custom" : "classic" });
            }}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="classic">Teléfono clásico / Classic phone</option>
            {settings.ringtoneLabel && <option value="custom">Personal / Custom</option>}
          </select>
          <Button type="button" variant="secondary" size="icon" disabled={importing} onClick={preview}
            aria-label={playing ? "Detener tono / Stop ringtone" : "Escuchar tono / Preview ringtone"}
            title={playing ? "Detener / Stop" : "Escuchar / Preview"}>
            {playing ? <Square /> : <Play />}
          </Button>
        </div>
        {settings.ringtone === "custom" && <p className="break-all text-sm text-muted-foreground">{settings.ringtoneLabel}</p>}
        <Button type="button" variant="secondary" disabled={importing} className="w-full" onClick={() => audioRef.current?.click()}>
          <Music2 /> {importing ? "Importando… / Importing…" : "Importar tono / Import ringtone"}
        </Button>
        <input ref={audioRef} type="file" accept="audio/*,.m4r,.caf,.wav,.aiff" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleAudio(file);
        }} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Label htmlFor="locked" className="text-muted-foreground text-xs uppercase tracking-wider">
          Pantalla bloqueada / Locked screen
        </Label>
        <Switch
          id="locked"
          checked={!!settings.lockedScreen}
          onCheckedChange={(checked) => onChange({ ...settings, lockedScreen: checked })}
        />
      </div>
    </div>
  );
}