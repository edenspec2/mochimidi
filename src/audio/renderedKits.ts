// The dubstep and epic pads: original sounds built from oscillators and noise, rendered once, so playing them costs almost nothing.

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
/** A big room around whatever is wired in; each ear's echoes differ, so the tail is wide. Returns the input. */
const hall = (c: OfflineAudioContext, sec: number, wet: number, out: AudioNode) => {
  const ir = c.createBuffer(2, Math.round(sec * c.sampleRate), c.sampleRate), input = level(c), room = c.createConvolver()
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 10 ** (-3 * i / d.length) }
  room.buffer = ir
  wire(input, out); wire(input, room, level(c, wet), out)
  return input
}

/** `cut`: a new hit stops the last sound of the same group, so long sounds don't pile up into mud. */
interface Sound { sec: number; cut?: number; make: (c: OfflineAudioContext, out: AudioNode) => void }

/** Pad order matches DUB_DRUMS. */
const DUB: Sound[] = [
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
  { sec: 1.6, cut: 1, make: (c, out) => { // Wobble: driven saws through a resonant filter opened and shut four times a second, over a steady sub
    const saws = level(c, 0.5), lp = filter(c, 'lowpass', 900, 8), lfo = level(c, 840)
    wire(osc(c, 'sawtooth', 55), saws); wire(osc(c, 'sawtooth', 55.6), saws)
    wire(osc(c, 'sine', 4), lfo); lfo.connect(lp.frequency)
    wire(saws, drive(c, 3), lp, out) // filter last: distortion after it flattened the wobble away
    wire(osc(c, 'sine', 55), level(c, 0.25), out)
  } },
  { sec: 0.8, cut: 1, make: (c, out) => { // Growl: frequency modulation through a sweeping vowel-like band
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
  { sec: 2.2, cut: 2, make: (c, out) => { // Sub drop: a long slide down to the floor
    const sub = osc(c, 'sine', 120); sweep(sub.frequency, 120, 30, 2)
    const fade = level(c); fade.gain.setValueAtTime(1, 1.4); fade.gain.linearRampToValueAtTime(0, 2.2)
    wire(sub, drive(c, 2), fade, out)
  } },
  { sec: 3, cut: 3, make: (c, out) => { // Riser: noise and a saw climbing together, cut at the top
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

/** Pad order matches EPIC_DRUMS. Percussion rings on under a new hit, so a roll keeps its room. */
const EPIC: Sound[] = [
  { sec: 2.2, make: (c, out) => { // Taiko: a huge skin, its thump and a short ring, in a hall
    const mix = level(c), body = osc(c, 'sine', 130); sweep(body.frequency, 130, 62, 0.08)
    wire(body, decay(c, 1.1), mix)
    wire(osc(c, 'triangle', 220), decay(c, 0.08), level(c, 0.5), mix)
    wire(noise(c), filter(c, 'lowpass', 1200), decay(c, 0.05), level(c, 0.8), mix)
    wire(mix, drive(c, 2.5), hall(c, 1.8, 0.35, out))
  } },
  { sec: 1.8, make: (c, out) => { // War snare: a crack with a long room behind it
    const mix = level(c), tone = osc(c, 'triangle', 240); sweep(tone.frequency, 240, 170, 0.06)
    wire(tone, decay(c, 0.2), mix)
    wire(noise(c), filter(c, 'bandpass', 2500, 0.7), decay(c, 0.35), level(c, 2), mix)
    wire(mix, drive(c, 3), hall(c, 1.5, 0.5, out))
  } },
  { sec: 4, cut: 1, make: (c, out) => { // Braam: low brass that tears open, then settles
    const lp = filter(c, 'lowpass', 150, 2), swell = level(c, 0)
    for (const hz of [41.2, 41.4, 82.4, 82.9, 123.6]) wire(osc(c, 'sawtooth', hz), level(c, 0.3), lp)
    lp.frequency.setValueAtTime(150, 0); lp.frequency.exponentialRampToValueAtTime(2200, 0.5); lp.frequency.exponentialRampToValueAtTime(700, 3)
    swell.gain.setValueAtTime(0, 0); swell.gain.linearRampToValueAtTime(1, 0.04); swell.gain.setValueAtTime(1, 2.6); swell.gain.linearRampToValueAtTime(0, 3.6)
    wire(lp, drive(c, 4), swell, hall(c, 3, 0.4, out))
  } },
  { sec: 2.6, make: (c, out) => { // Orchestra hit: a short minor chord over a low strike
    const lp = filter(c, 'lowpass', 3000), stab = level(c)
    for (const hz of [110, 165, 220, 261.6, 329.6, 440]) { wire(osc(c, 'sawtooth', hz), level(c, 0.25), lp); wire(osc(c, 'sawtooth', hz * 1.004), level(c, 0.15), lp) }
    wire(noise(c), level(c, 0.3), lp)
    wire(lp, decay(c, 0.5), stab)
    wire(osc(c, 'sine', 55), decay(c, 0.7), level(c, 1.2), stab)
    wire(stab, drive(c, 1.5), hall(c, 2.2, 0.6, out))
  } },
  { sec: 4, cut: 2, make: (c, out) => { // Choir: voices held on "ah", three vowel bands over detuned saws with a slow vibrato
    const voices = level(c), vibrato = level(c, 3), swell = level(c, 0), room = hall(c, 3.5, 0.7, out)
    wire(osc(c, 'sine', 5), vibrato)
    for (const hz of [220, 221.5, 329.6, 331.5, 440, 442.5]) { const o = osc(c, 'sawtooth', hz); vibrato.connect(o.frequency); wire(o, level(c, 0.2), voices) }
    for (const [hz, gain] of [[700, 1], [1100, 0.7], [2600, 0.3]]) wire(voices, filter(c, 'bandpass', hz, 7), level(c, gain), swell)
    swell.gain.setValueAtTime(0, 0); swell.gain.linearRampToValueAtTime(1, 0.35); swell.gain.setValueAtTime(1, 2.4); swell.gain.linearRampToValueAtTime(0, 3.4)
    swell.connect(room)
  } },
  { sec: 5, make: (c, out) => { // Thunder: a crack, then a rumble that rolls unevenly away
    const room = hall(c, 3, 0.3, out)
    wire(noise(c), filter(c, 'highpass', 1200), decay(c, 0.2), room)
    const roll = level(c, 0), steps = Float32Array.from({ length: 40 }, (_, i) => (0.35 + 0.65 * Math.random()) * Math.exp(-3 * i / 40))
    roll.gain.setValueCurveAtTime(steps, 0.05, 4.8)
    wire(noise(c), filter(c, 'lowpass', 180, 0.5), level(c, 5), drive(c, 2), roll, room)
  } },
  { sec: 5, make: (c, out) => { // Gong: partials that don't belong to one note, each fading at its own rate, then a late shimmer
    const room = hall(c, 3, 0.5, out)
    for (const [hz, sec] of [[98, 4.5], [147.3, 4], [213, 3.4], [282, 3], [377, 2.6], [481, 2.2], [612, 1.8], [761, 1.4]]) wire(osc(c, 'sine', hz), decay(c, sec), level(c, 0.3), room)
    const shimmer = level(c, 0); shimmer.gain.setValueAtTime(0, 0); shimmer.gain.linearRampToValueAtTime(0.25, 0.5); shimmer.gain.exponentialRampToValueAtTime(0.001, 4.5)
    wire(noise(c), filter(c, 'bandpass', 3000, 1), shimmer, room)
  } },
  { sec: 1.6, make: (c, out) => { // Whoosh: air rushing past
    const band = filter(c, 'bandpass', 400, 2), swell = level(c, 0)
    band.frequency.setValueAtTime(400, 0); band.frequency.exponentialRampToValueAtTime(2500, 0.45); band.frequency.exponentialRampToValueAtTime(300, 1)
    swell.gain.setValueAtTime(0, 0); swell.gain.linearRampToValueAtTime(1, 0.45); swell.gain.linearRampToValueAtTime(0, 1)
    wire(noise(c), band, swell, hall(c, 0.6, 0.4, out))
  } },
]

export const RENDERED_KITS = { dub: DUB, epic: EPIC }
export type RenderedKit = keyof typeof RENDERED_KITS

const rendered: Partial<Record<RenderedKit, Promise<AudioBuffer>[]>> = {}
/** Every pad of `kit`, rendered at most once. */
export const renderKit = (kit: RenderedKit, rate: number) => (rendered[kit] ??= RENDERED_KITS[kit].map((_, k) => renderHit(kit, k, rate)))

/** Pad `k` as a recording, its peak matching the standard kick's so the kits can be swapped. */
async function renderHit(kit: RenderedKit, k: number, rate: number) {
  const { sec, make } = RENDERED_KITS[kit][k]
  const c = new OfflineAudioContext(2, Math.round(sec * rate), rate)
  make(c, c.destination)
  const b = await c.startRendering(), chs = [b.getChannelData(0), b.getChannelData(1)]
  let peak = 0
  for (const d of chs) for (const v of d) peak = Math.max(peak, Math.abs(v))
  const fade = Math.round(0.02 * rate)
  for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= (0.9 / peak) * Math.min(1, (d.length - 1 - i) / fade)
  return b
}
