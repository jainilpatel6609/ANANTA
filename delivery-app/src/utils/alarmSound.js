/**
 * ANANTA TRADERS - High-Priority Web Audio API Dispatch Alarm Synthesizer
 * Zero-dependency, reliable in-app tone generator for Dealer & Admin portals.
 */

let audioCtx = null;
let alarmInterval = null;
let isPlaying = false;
let isMuted = false;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Play a single 2-tone dispatch pulse
const playPulse = (freq1 = 880, freq2 = 1174.66) => {
  if (isMuted) return;
  const ctx = initAudio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq1, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2 (higher alert frequency)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq2, now + 0.2);
    gain2.gain.setValueAtTime(0.18, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.42);
  } catch (err) {
    console.warn('[Audio Synthesizer Warning]', err);
  }
};

export const startAlarmSound = (type = 'DEALER') => {
  if (isPlaying) return;
  isPlaying = true;

  // Immediate first pulse
  if (type === 'ADMIN') {
    playPulse(987.77, 1318.51); // Higher urgent pitch for Admin
  } else {
    playPulse(880, 1174.66); // Standard dispatch dual-tone for Dealer
  }

  // Loop alert every 1.5 seconds until stopped
  alarmInterval = setInterval(() => {
    if (type === 'ADMIN') {
      playPulse(987.77, 1318.51);
    } else {
      playPulse(880, 1174.66);
    }
  }, 1500);
};

export const stopAlarmSound = () => {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  isPlaying = false;
};

export const toggleMuteAlarm = () => {
  isMuted = !isMuted;
  if (isMuted) {
    stopAlarmSound();
  }
  return isMuted;
};

export const isAlarmActive = () => isPlaying;
export const isAlarmMuted = () => isMuted;

