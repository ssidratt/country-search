let soundEnabled = false;
let audioContext: AudioContext | null = null;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

export function playSound(type: "click" | "success" | "error"): void {
  if (!soundEnabled) return;

  try {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const frequencies = {
      click: 520,
      success: 780,
      error: 220,
    };

    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequencies[type], now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequencies[type] * 1.2,
      now + 0.12,
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.16);
  } catch {
    // Audio may be unavailable in the browser.
  }
}
