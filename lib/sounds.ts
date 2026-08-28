// 🔊 Tiny game sounds (WebAudio — no files needed)
function makeCtx(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new Ctx();
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  o.type = type;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function playCorrect() {
  const c = makeCtx();
  if (!c) return;
  tone(c, 660, 0, 0.15, "sine", 0.25);
  tone(c, 880, 0.12, 0.2, "sine", 0.25);
}

export function playWrong() {
  const c = makeCtx();
  if (!c) return;
  tone(c, 220, 0, 0.2, "square", 0.07);
  tone(c, 180, 0.15, 0.25, "square", 0.07);
}

export function playWin() {
  const c = makeCtx();
  if (!c) return;
  tone(c, 523, 0, 0.15, "sine", 0.25);
  tone(c, 659, 0.12, 0.15, "sine", 0.25);
  tone(c, 784, 0.24, 0.3, "sine", 0.25);
}
