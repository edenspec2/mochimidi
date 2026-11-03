// Effects the touch strips play over the whole mix: keys, drums, tracks and drone together. The browser's own nodes,
// built the first time a strip needs them, so the phone engine can have them too and nobody else pays for them.

export type MixEffect = 'filter' | 'echo' | 'wobble' | 'stutter'
export type StripFx = 'bend' | 'vibrato' | MixEffect

const OPEN = 20000 // Hz: a low-pass this high changes nothing
const SMOOTH = 0.015 // s: a strip jumps; the sound must not click

/** −1..1: down closes a low-pass to 200 Hz, up raises a high-pass to 2.5 kHz, the middle leaves the sound alone. */
export const filterAt = (x: number) => ({ low: OPEN * 0.01 ** Math.max(0, -x), high: 20 * 125 ** Math.max(0, x), Q: Math.abs(x) * 10 })
/** Further up the strip the wobble speeds up: quarters, eighths, triplets, sixteenths. */
export const wobbleHz = (x: number, bpm: number) => (bpm / 60) * Math.min(4, 1 + Math.floor(x * 4))
/** Eighth-note chops, sixteenths past half-way. */
export const stutterHz = (x: number, bpm: number) => (bpm / 60) * (x < 0.5 ? 2 : 4)

/** input → low-pass → high-pass → wobble → gate → output, and an echo fed from the gate. */
export class MixFx {
  readonly input: BiquadFilterNode
  readonly output: GainNode
  private ctx: BaseAudioContext
  private high: BiquadFilterNode
  private wobble: BiquadFilterNode
  private wobbleDepth: GainNode
  private wobbleLfo: OscillatorNode
  private gate: GainNode
  private chopDepth: GainNode
  private chopSmooth: BiquadFilterNode
  private chop: OscillatorNode | null = null
  private send: GainNode
  private delay: DelayNode
  private feedback: GainNode

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx
    const biquad = (type: BiquadFilterType, hz: number) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; return f }
    const gain = (v: number) => { const g = ctx.createGain(); g.gain.value = v; return g }
    this.input = biquad('lowpass', OPEN); this.input.Q.value = 0
    this.high = biquad('highpass', 20); this.high.Q.value = 0
    this.wobble = biquad('lowpass', OPEN); this.wobble.Q.value = 0
    this.gate = gain(1); this.output = gain(1)
    this.input.connect(this.high).connect(this.wobble).connect(this.gate).connect(this.output)
    this.wobbleLfo = ctx.createOscillator(); this.wobbleDepth = gain(0)
    this.wobbleLfo.connect(this.wobbleDepth).connect(this.wobble.detune)
    this.wobbleLfo.start()
    this.chopSmooth = biquad('lowpass', 400); this.chopDepth = gain(0)
    this.chopSmooth.connect(this.chopDepth).connect(this.gate.gain)
    this.send = gain(0); this.feedback = gain(0)
    this.delay = ctx.createDelay(2)
    const tone = biquad('lowpass', 3000) // each repeat darker, like tape
    this.gate.connect(this.send).connect(this.delay).connect(tone).connect(this.output)
    tone.connect(this.feedback).connect(this.delay)
  }

  private glide(p: AudioParam, v: number) { p.setTargetAtTime(v, this.ctx.currentTime, SMOOTH) }

  /** `x` is the strip: −1..1 for the filter, 0..1 for the rest, 0 for off. Speeds follow the tempo from the next strip move. */
  set(fx: MixEffect, x: number, bpm: number) {
    if (Math.abs(x) < 0.03) x = 0 // a finger never lands on exactly zero
    if (fx === 'filter') {
      const f = filterAt(x)
      this.glide(this.input.frequency, f.low); this.glide(this.high.frequency, f.high)
      this.glide(x < 0 ? this.input.Q : this.high.Q, f.Q); this.glide(x < 0 ? this.high.Q : this.input.Q, 0)
    } else if (fx === 'echo') {
      this.glide(this.send.gain, x)
      this.glide(this.feedback.gain, x && 0.35 + 0.3 * x)
      if (x) this.delay.delayTime.setTargetAtTime(Math.min(2, (60 / bpm) * 0.75), this.ctx.currentTime, SMOOTH) // a dotted eighth
    } else if (fx === 'wobble') {
      this.glide(this.wobble.frequency, x ? 500 : OPEN); this.glide(this.wobble.Q, x ? 8 : 0)
      this.glide(this.wobbleDepth.gain, x ? 2400 : 0) // cents: two octaves each way
      this.wobbleLfo.frequency.value = wobbleHz(x, bpm)
    } else this.stutter(x, bpm)
  }

  /** The chop starts at the touch, so it lands wherever the player puts it. */
  private stutter(x: number, bpm: number) {
    if (x && !this.chop) {
      this.chop = this.ctx.createOscillator()
      this.chop.type = 'square'
      this.chop.connect(this.chopSmooth)
      this.chop.start()
    } else if (!x && this.chop) { this.chop.stop(); this.chop = null }
    if (this.chop) this.chop.frequency.value = stutterHz(x, bpm)
    const depth = Math.min(1, x * 2)
    this.glide(this.gate.gain, 1 - depth / 2); this.glide(this.chopDepth.gain, depth / 2)
  }

  clear(bpm: number) { for (const fx of ['filter', 'echo', 'wobble', 'stutter'] as const) this.set(fx, 0, bpm) }
}
