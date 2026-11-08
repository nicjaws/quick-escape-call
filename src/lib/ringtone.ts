export const MAX_RINGTONE_SECONDS = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SAMPLE_RATE = 44100;

export interface PersonalRingtone {
  name: string;
  dataUrl: string;
}

function openToneStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("fakecall-private-audio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("tones");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento / Storage unavailable"));
  });
}

export async function savePersonalRingtone(tone: PersonalRingtone): Promise<void> {
  const db = await openToneStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("tones", "readwrite");
      transaction.objectStore("tones").put(tone, "personal");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("No se pudo guardar el tono / Could not save tone"));
      transaction.onabort = () => reject(new Error("No se pudo guardar el tono / Could not save tone"));
    });
  } finally { db.close(); }
}

export async function getPersonalRingtone(): Promise<PersonalRingtone | undefined> {
  const db = await openToneStore();
  try {
    return await new Promise<PersonalRingtone | undefined>((resolve, reject) => {
      const request = db.transaction("tones").objectStore("tones").get("personal");
      request.onsuccess = () => resolve(request.result as PersonalRingtone | undefined);
      request.onerror = () => reject(new Error("No se pudo leer el tono / Could not read tone"));
    });
  } finally { db.close(); }
}

/** One shared PCM file for in-app playback and iOS notification sounds. */
export async function preparePersonalRingtone(file: File): Promise<PersonalRingtone> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Máximo 25 MB / Maximum 25 MB");
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    if (!decoded.duration || !decoded.numberOfChannels) throw new Error("Audio vacío / Empty audio");
    const frames = Math.floor(Math.min(decoded.duration, MAX_RINGTONE_SECONDS) * SAMPLE_RATE);
    const renderer = new OfflineAudioContext(1, frames, SAMPLE_RATE);
    const source = renderer.createBufferSource();
    source.buffer = decoded;
    source.connect(renderer.destination);
    source.start();
    const mono = (await renderer.startRendering()).getChannelData(0);
    const wav = encodeMonoWav(mono, SAMPLE_RATE);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Audio no válido / Invalid audio"));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo / Could not read file"));
      reader.readAsDataURL(new Blob([wav], { type: "audio/wav" }));
    });
    return { name: file.name, dataUrl };
  } catch (error) {
    if (error instanceof Error && error.message.includes(" / ")) throw error;
    throw new Error("Formato no compatible / Unsupported audio format");
  } finally { await decoder.close(); }
}

export function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const length = Math.min(samples.length, Math.floor(sampleRate * MAX_RINGTONE_SECONDS));
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF"); view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return buffer;
}

/** Returns cleanup immediately, including when the file is still loading. */
export function startRingtone(mode: "classic" | "custom" = "classic", onError?: () => void): () => void {
  let stopped = false;
  let cleanup: (() => void) | undefined;
  if (mode === "custom") {
    void getPersonalRingtone().then((tone) => {
      if (stopped) return;
      if (!tone) { onError?.(); return; }
      const audio = new Audio(tone.dataUrl);
      audio.loop = true;
      cleanup = () => { audio.pause(); audio.removeAttribute("src"); audio.load(); };
      void audio.play().catch(() => { if (!stopped) onError?.(); });
    }).catch(() => { if (!stopped) onError?.(); });
  } else {
    const ctx = new AudioContext();
    const bell = () => {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
      gain.gain.setValueAtTime(0.35, now + 1.95);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
      gain.connect(ctx.destination);
      const tremolo = ctx.createOscillator();
      tremolo.frequency.value = 20;
      const modulation = ctx.createGain();
      modulation.gain.value = 0.25;
      tremolo.connect(modulation); modulation.connect(gain.gain);
      tremolo.start(now); tremolo.stop(now + 2);
      for (const frequency of [440, 480]) {
        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + 2);
      }
    };
    void ctx.resume().catch(() => onError?.());
    bell();
    const timer = window.setInterval(bell, 6000);
    cleanup = () => { window.clearInterval(timer); void ctx.close().catch(() => undefined); };
  }
  return () => { stopped = true; cleanup?.(); };
}