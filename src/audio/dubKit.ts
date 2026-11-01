// The dubstep pads: original sounds built from oscillators and noise, rendered once, so playing them costs almost nothing.

const sweep = (p: AudioParam, from: number, to: number, sec: number, at = 0) => { p.setValueAtTime(from, at); p.exponentialRampToValueAtTime(to, at + sec) }
const osc = (c: OfflineAudioContext, type: OscillatorType, hz: number) => { const o = c.createOscillator(); o.type = type; o.frequency.value = hz; o.start(); return o }
const level = (c: OfflineAudioContext, v = 1) => { const g = c.createGain(); g.gain.value = v; return g }
const decay = (c: OfflineAudioContext, sec: number) => { const g = level(c); sweep(g.gain, 1, 0.001, sec); return g }
const filter = (c: OfflineAudioContext, type: BiquadFilterType, hz: number, Q = 1) => { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = Q; return f }
const noise = (c: OfflineAudioContext) => {
  const b = c.createBuffer(1, c.length, c.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const s = c.createBufferSource(); s.buffer = b; s.start()
  return s
}
const drive = (c: OfflineAudioContext, k: number) => { const w = c.createWaveShaper(); w.curve = Float32Array.from({ length: 1025 }, (_, i) => Math.tanh(k * (i / 512 - 1))); return w }
const wire = (...nodes: AudioNode[]) => { for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]) }

/** Pad order matches DUB_DRUMS. */
const SOUNDS: { sec: number; make: (c: OfflineAudioContext, out: AudioNode) => void }[] = [
  { sec: 0.6, make: (c, out) => { // Sub kick: a fast pitch dive with a click on top
    const body = osc(c, 'sine', 150); sweep(body.frequency, 150, 45, 0.09)
    wire(body, drive(c, 3), decay(c, 0.5), out)
    wire(noise(c), filter(c, 'highpass', 3000), decay(c, 0.012), level(c, 0.5), out)
  } },
  { sec: 0.45, make: (c, out) => { // Dub snare: a short tone under bright noise, driven hard
    const mix = level(c)
    const tone = osc(c, 'triangle', 210); sweep(tone.frequency, 210, 150, 0.05)
    wire(tone, decay(c, 0.16), mix)
    wire(noise(c), filter(c, 'highpass', 1500), decay(c, 0.3), level(c, 0.8), mix)
    wire(mix, drive(c, 2), out)
  } },
  { sec: 1.6, make: (c, out) => { // Wobble: driven saws through a resonant filter opened and shut four times a second, over a steady sub
    const saws = level(c, 0.5), lp = filter(c, 'lowpass', 900, 8), lfo = level(c, 840)
    wire(osc(c, 'sawtooth', 55), saws); wire(osc(c, 'sawtooth', 55.6), saws)
    wire(osc(c, 'sine', 4), lfo); lfo.connect(lp.frequency)
    wire(saws, drive(c, 3), lp, out) // filter last: distortion after it flattened the wobble away
    wire(osc(c, 'sine', 55), level(c, 0.25), out)
  } },
  { sec: 0.8, make: (c, out) => { // Growl: frequency modulation through a sweeping vowel-like band
    const saw = osc(c, 'sawtooth', 82.4), depth = level(c, 0)
    wire(osc(c, 'sine', 164.8), depth); depth.connect(saw.frequency)
    depth.gain.setValueAtTime(40, 0); depth.gain.linearRampToValueAtTime(420, 0.3); depth.gain.linearRampToValueAtTime(80, 0.8)
    const band = filter(c, 'bandpass', 350, 6), mix = level(c)
    band.frequency.setValueAtTime(350, 0); band.frequency.exponentialRampToValueAtTime(1600, 0.3); band.frequency.exponentialRampToValueAtTime(500, 0.8)
    wire(saw, band, level(c, 3), mix); wire(saw, filter(c, 'lowpass', 160), mix)
    wire(mix, drive(c, 5), out)
  } },
  { sec: 0.8, make: (c, out) => { // Laser: a square diving from high to low, with an echo
    const zap = osc(c, 'square', 2400); sweep(zap.frequency, 2400, 90, 0.3)
    const echo = c.createDelay(0.2), back = level(c, 0.4); echo.delayTime.value = 0.11
    const shot = level(c); wire(zap, decay(c, 0.32), shot)
    wire(shot, echo, back, echo); wire(shot, out); wire(echo, level(c, 0.6), out)
  } },
  { sec: 2.2, make: (c, out) => { // Sub drop: a long slide down to the floor
    const sub = osc(c, 'sine', 120); sweep(sub.frequency, 120, 30, 2)
    const fade = level(c); fade.gain.setValueAtTime(1, 1.4); fade.gain.linearRampToValueAtTime(0, 2.2)
    wire(sub, drive(c, 2), fade, out)
  } },
  { sec: 3, make: (c, out) => { // Riser: noise and a saw climbing together, cut at the top
    const band = filter(c, 'bandpass', 300, 3); sweep(band.frequency, 300, 9000, 3)
    const saw = osc(c, 'sawtooth', 110); sweep(saw.frequency, 110, 880, 3)
    const swell = level(c); sweep(swell.gain, 0.12, 1, 3)
    wire(noise(c), band, swell); wire(saw, level(c, 0.15), swell)
    swell.connect(out)
  } },
  { sec: 2.8, make: (c, out) => { // Impact: a deep boom under a darkening burst of noise
    const boom = osc(c, 'sine', 70); sweep(boom.frequency, 70, 28, 0.6)
    const lp = filter(c, 'lowpass', 4000); sweep(lp.frequency, 4000, 200, 1.2)
    const mix = level(c)
    wire(boom, decay(c, 2.6), mix); wire(noise(c), lp, decay(c, 1.6), level(c, 0.7), mix)
    wire(mix, drive(c, 3), out)
  } },
]

/** Pad `k` as a recording, its peak matching the standard kick's so the kits can be swapped. */
export async function renderDub(k: number, rate: number) {
  const { sec, make } = SOUNDS[k]
  const c = new OfflineAudioContext(1, Math.round(sec * rate), rate)
  make(c, c.destination)
  const b = await c.startRendering(), d = b.getChannelData(0)
  let peak = 0
  for (const v of d) peak = Math.max(peak, Math.abs(v))
  const fade = Math.round(0.02 * rate)
  for (let i = 0; i < d.length; i++) d[i] *= (0.9 / peak) * Math.min(1, (d.length - 1 - i) / fade)
  return b
}
