import { useState, useEffect } from "react";

export interface CallSettings {
  callerName: string;
  delaySeconds: number;
  callerPhoto?: string; // data URL
  lockedScreen?: boolean;
  ringtone?: "classic" | "custom";
  ringtoneLabel?: string;
}

const DEFAULT_SETTINGS: CallSettings = {
  callerName: "Trabajo",
  delaySeconds: 10,
  callerPhoto: undefined,
  lockedScreen: false,
  ringtone: "classic",
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