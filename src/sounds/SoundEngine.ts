// Sound Engine using Web Audio API - generates all game sounds programmatically
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

let masterVolume = 0.5;
let sfxEnabled = true;
let musicEnabled = true;

export function setMasterVolume(vol: number) {
  masterVolume = Math.max(0, Math.min(1, vol));
}

export function getMasterVolume() {
  return masterVolume;
}

export function setSfxEnabled(enabled: boolean) {
  sfxEnabled = enabled;
}

export function getSfxEnabled() {
  return sfxEnabled;
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (!enabled) {
    stopMusic();
  }
}

export function getMusicEnabled() {
  return musicEnabled;
}

export function playFlap() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.3 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playScore() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.25 * masterVolume, ctx.currentTime + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
    
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.2);
  });
}

export function playHit() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  
  // Impact sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.3 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  
  // Noise burst
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.2 * masterVolume, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  noise.start(ctx.currentTime);
}

export function playDie() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
  
  gain.gain.setValueAtTime(0.2 * masterVolume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15 * masterVolume, ctx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
}

export function playSwoosh() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
  }
  
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  
  noise.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.15);
  filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3);
  filter.Q.value = 2;
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  noise.start(ctx.currentTime);
}

export function playButtonClick() {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.05);
  
  gain.gain.setValueAtTime(0.15 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

// Background music using Web Audio API
let musicOscillators: OscillatorNode[] = [];
let musicGains: GainNode[] = [];
let musicInterval: number | null = null;

const melody = [
  262, 294, 330, 349, 392, 349, 330, 294,
  262, 330, 392, 523, 392, 330, 294, 262,
  349, 392, 440, 392, 349, 330, 294, 330,
  262, 294, 330, 392, 440, 392, 330, 262,
];

let melodyIndex = 0;

export function startMusic() {
  if (!musicEnabled) return;
  stopMusic();
  
  const ctx = getAudioContext();
  melodyIndex = 0;
  
  function playNote() {
    if (!musicEnabled) return;
    getAudioContext();
    
    const freq = melody[melodyIndex % melody.length];
    melodyIndex++;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.5, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    
    musicOscillators.push(osc);
    musicGains.push(gain);
  }
  
  playNote();
  musicInterval = window.setInterval(playNote, 400);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  musicOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  musicOscillators = [];
  musicGains = [];
}

export function initAudio() {
  try {
    getAudioContext();
  } catch (e) {
    console.warn('Audio context not available');
  }
}
