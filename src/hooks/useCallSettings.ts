import { useState, useEffect } from "react";

export interface CallSettings {
  callerName: string;
  callerLabel: string;
  delaySeconds: number;
}

const DEFAULT_SETTINGS: CallSettings = {
  callerName: "Trabajo",
  callerLabel: "iPhone",
  delaySeconds: 30,
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