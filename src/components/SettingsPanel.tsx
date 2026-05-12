import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";
import { useRef } from "react";
import type { CallSettings } from "@/hooks/useCallSettings";

interface SettingsPanelProps {
  settings: CallSettings;
  onChange: (settings: CallSettings) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

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