import { useState, useEffect } from "react";

export interface CallSettings {
  callerName: string;
  callerLabel: string;
  delaySeconds: number;
  callerPhoto?: string; // data URL
  lockedScreen?: boolean;
}

const DEFAULT_SETTINGS: CallSettings = {
  callerName: "Trabajo",
  callerLabel: "móvil",
  delaySeconds: 30,
  callerPhoto: undefined,
  lockedScreen: false,
};

export function useCallSettings() {
  const [settings, setSettings] = useState<CallSettings>(() => {
    const saved = localStorage.getItem("fakecall-settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("fakecall-settings", JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}