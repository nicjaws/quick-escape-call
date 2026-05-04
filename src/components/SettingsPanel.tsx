import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CallSettings } from "@/hooks/useCallSettings";

interface SettingsPanelProps {
  settings: CallSettings;
  onChange: (settings: CallSettings) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="callerName" className="text-muted-foreground text-xs uppercase tracking-wider">
          Nombre del contacto
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
        <Label htmlFor="callerLabel" className="text-muted-foreground text-xs uppercase tracking-wider">
          Etiqueta secundaria
        </Label>
        <Input
          id="callerLabel"
          value={settings.callerLabel}
          onChange={(e) => onChange({ ...settings, callerLabel: e.target.value })}
          placeholder="Ej: iPhone, Móvil..."
          className="bg-secondary border-border text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delay" className="text-muted-foreground text-xs uppercase tracking-wider">
          Retardo (segundos)
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
    </div>
  );
}