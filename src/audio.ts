let ctx: AudioContext | null = null;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;
let designType = "sine";

const DESIGN_WAVEFORM: Record<string, OscillatorType> = {
  tri: "triangle",
  hexa: "sawtooth",
  quad: "square",
  barbell: "sine",
  turbine: "sawtooth",
};

export function setDesign(id: string) {
  designType = id;
  if (humOsc && ctx) {
    humOsc.type = DESIGN_WAVEFORM[id] || "sine";
  }
}

export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  humOsc = ctx.createOscillator();
  humGain = ctx.createGain();
  humOsc.type = "sine";
  humOsc.frequency.value = 80;
  humGain.gain.value = 0;
  humOsc.connect(humGain);
  humGain.connect(ctx.destination);
  humOsc.start();
}

export function updateHum(rpm: number, dt: number) {
  if (!ctx || !humOsc || !humGain) return;
  const absRpm = Math.abs(rpm);
  const speed = Math.min(absRpm / 3000, 1);
  humOsc.frequency.value = 60 + speed * 400;
  humGain.gain.value = speed * 0.06;
}

export function playFlick(omega: number) {
  if (!ctx) return;
  const absOmega = Math.min(Math.abs(omega) / 250, 1);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = DESIGN_WAVEFORM[designType] || "sine";
  osc.frequency.setValueAtTime(200 + absOmega * 600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playBrake() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

export function playClick() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}
