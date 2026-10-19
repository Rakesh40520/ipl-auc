/**
 * Synthesized Web Audio Sound Effects for IPL Auction
 * Zero external audio files needed; crisp, instant, latency-free.
 */

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

// 1. Crisp Auctioneer Gavel Strike
export function playGavel() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary wood thud
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(140, now);
  osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);

  gain1.gain.setValueAtTime(1.0, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // High wood snap
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(650, now);
  osc2.frequency.exponentialRampToValueAtTime(120, now + 0.06);

  gain2.gain.setValueAtTime(0.6, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.09);
}

// 2. Bid Placed Sound (Ascending Tone)
export function playBid() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// 3. Countdown Beep
export function playCountdownBeep(isLow = false) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = isLow ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(isLow ? 880 : 587.33, now); // D5 or A5

  gain.gain.setValueAtTime(isLow ? 0.35 : 0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// 4. Sold Fanfare / Win Chime
export function playSoldChime() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  });
}

// 5. Championship Grand Trophy Fanfare & Victory Chorus
export function playTrophyCelebration() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Ascending majestic fanfare arpeggio (C4, G4, C5, E5, G5, C6)
  const fanfareNotes = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  fanfareNotes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.11;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.35, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(noteTime);
    osc.stop(noteTime + 0.55);
  });

  // Sustained triumphant harmonic power chord at the climax
  const chordNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  const chordTime = now + 0.72;
  chordNotes.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, chordTime);

    gain.gain.setValueAtTime(0.28, chordTime);
    gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(chordTime);
    osc.stop(chordTime + 1.9);
  });
}
