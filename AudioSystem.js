const COOLDOWNS = Object.freeze({
  countdown: 0.42,
  drift: 0.1,
  turbo: 0.18,
  collect: 0.08,
  item: 0.16,
  jump: 0.16,
  hit: 0.22,
});

const EVENT_TONES = Object.freeze({
  countdown: [620, 0.16, 'square'],
  drift: [210, 0.06, 'sawtooth'],
  turbo: [340, 0.2, 'sawtooth'],
  collect: [760, 0.13, 'triangle'],
  item: [480, 0.15, 'square'],
  jump: [540, 0.14, 'triangle'],
  hit: [118, 0.18, 'sawtooth'],
});

function defaultContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Context) throw new Error('Web Audio unavailable');
  return new Context();
}

function setParam(param, value, time, ramp = false) {
  if (!param) return;
  param.cancelScheduledValues?.(time);
  if (ramp) param.linearRampToValueAtTime?.(value, time);
  else param.setValueAtTime?.(value, time);
  if ('value' in param) param.value = value;
}

export class AudioSystem {
  constructor({ contextFactory = defaultContextFactory, now = () => performance.now() / 1000 } = {}) {
    this.contextFactory = contextFactory;
    this.now = now;
    this.context = null;
    this.master = null;
    this.engine = null;
    this.nodes = new Set();
    this.lastEventAt = new Map();
    this.unlocked = false;
    this.disposed = false;
    this.failed = false;
  }

  unlock() {
    if (this.disposed) return false;
    if (this.unlocked) return true;
    try {
      this.context ??= this.contextFactory();
      this.master ??= this.#gain(0.48);
      this.master.connect(this.context.destination);
      this.unlocked = true;
      Promise.resolve(this.context.resume?.()).catch(() => {});
      return true;
    } catch {
      this.#disconnectAll();
      this.context = null;
      this.master = null;
      return false;
    }
  }

  updateEngine(speed = 0, boost = false) {
    if (!this.unlock()) return false;
    if (!this.engine) this.engine = this.#createEngine();
    const time = this.context.currentTime ?? 0;
    const normalizedSpeed = Math.min(Math.max(Math.abs(speed) / 43, 0), 1);
    const base = 72 + normalizedSpeed * 126 + (boost ? 48 : 0);
    setParam(this.engine.low.frequency, base, time, true);
    setParam(this.engine.high.frequency, base * (boost ? 2.02 : 1.48), time, true);
    setParam(this.engine.gain.gain, 0.045 + normalizedSpeed * 0.11 + (boost ? 0.045 : 0), time, true);
    return true;
  }

  play(event) {
    const type = typeof event === 'string' ? event : event?.type;
    if (!EVENT_TONES[type] || !this.unlock()) return false;
    const now = this.now();
    const previous = this.lastEventAt.get(type) ?? -Infinity;
    if (now - previous < COOLDOWNS[type]) return false;
    this.lastEventAt.set(type, now);
    const [frequency, duration, wave] = EVENT_TONES[type];
    this.#oneShot(frequency, duration, wave, type === 'hit' ? 0.14 : 0.12);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.#disconnectAll();
    Promise.resolve(this.context?.close?.()).catch(() => {});
    this.context = null;
    this.engine = null;
    this.master = null;
  }

  #gain(value) {
    const gain = this.context.createGain();
    gain.gain.value = value;
    this.nodes.add(gain);
    return gain;
  }

  #oscillator(frequency, type) {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    this.nodes.add(oscillator);
    return oscillator;
  }

  #createEngine() {
    const gain = this.#gain(0.045);
    gain.connect(this.master);
    const low = this.#oscillator(72, 'sawtooth');
    const high = this.#oscillator(112, 'triangle');
    low.connect(gain);
    high.connect(gain);
    low.start();
    high.start();
    return { low, high, gain };
  }

  #oneShot(frequency, duration, type, volume) {
    const time = this.context.currentTime ?? 0;
    const gain = this.#gain(0.0001);
    const oscillator = this.#oscillator(frequency, type);
    oscillator.connect(gain);
    gain.connect(this.master);
    setParam(gain.gain, volume, time, false);
    gain.gain.exponentialRampToValueAtTime?.(0.0001, time + duration);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
    oscillator.__audioStopped = true;
    oscillator.onended = () => {
      oscillator.disconnect?.();
      gain.disconnect?.();
      this.nodes.delete(oscillator);
      this.nodes.delete(gain);
    };
  }

  #disconnectAll() {
    for (const node of this.nodes) {
      if (!node.__audioStopped) {
        try { node.stop?.(); } catch {}
      }
      try { node.disconnect?.(); } catch {}
    }
    this.nodes.clear();
  }
}
