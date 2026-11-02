// Free-play performance FX: arpeggiator and chord memory. They change only what sounds; the
// InputEvent stream (scorer, recorder) keeps the raw keys because live.ts calls this after midi.emit.
import { arpPattern, ARP_RATES, randomStep, transposeShape, type ArpSettings, type ChordSettings } from './arp'
import { audio } from './audioEngine'

const LOOKAHEAD = 0.1 // s of arp notes scheduled ahead on the audio clock
const TICK = 25 // ms between scheduler wake-ups (timer jitter is absorbed by the lookahead)

/** One running arpeggio over whatever is held: keys or pads. */
class Arp {
  pool: number[] = [] // input, in the order it went down
  held = new Set<number>()
  private vel = 90
  private step = 0
  private prevRandom = -1
  private next = 0
  private timer = 0
  private settings: () => ArpSettings
  private enabled: () => boolean
  private octaves: () => number
  private expand: (key: number) => number[]
  private play: (n: number, time: number, dur: number, vel: number) => void

  constructor(o: { settings: () => ArpSettings; enabled: () => boolean; octaves: () => number; expand: (key: number) => number[]; play: (n: number, time: number, dur: number, vel: number) => void }) {
    this.settings = o.settings; this.enabled = o.enabled; this.octaves = o.octaves; this.expand = o.expand; this.play = o.play
  }

  press(key: number, vel: number) {
    // Latch: the first key after letting go of everything starts a new pattern.
    if (this.settings().latch && this.held.size === 0) this.pool = []
    this.held.add(key)
    this.vel = vel
    for (const p of this.expand(key)) if (!this.pool.includes(p)) this.pool.push(p)
    if (!this.timer) this.start()
  }
  release(key: number) {
    if (!this.held.delete(key) || this.settings().latch) return
    // Keep notes another held key still contributes (chord memory shapes can overlap).
    const drop = this.expand(key), still = new Set([...this.held].flatMap((k) => this.expand(k)))
    this.pool = this.pool.filter((p) => !drop.includes(p) || still.has(p))
    if (!this.pool.length) this.stop()
  }
  /** Latch released: keep arpeggiating only what is still held. */
  onlyHeld() {
    if (!this.pool.length) return
    this.pool = [...new Set([...this.held].flatMap((k) => this.expand(k)))]
    if (!this.pool.length) this.stop()
  }

  private start() {
    this.step = 0
    this.next = audio.now() // the first note sounds at once, like pressing a key
    this.tick()
    this.timer = window.setInterval(() => this.tick(), TICK)
  }
  stop() {
    clearInterval(this.timer)
    this.timer = 0
    this.pool = []
  }

  private tick() {
    if (!this.enabled() || !this.pool.length) { this.stop(); return }
    const a = this.settings()
    const spb = 60 / audio.bpm, stepSec = (ARP_RATES[a.rate]?.beats ?? 0.5) * spb
    const now = audio.now()
    if (this.next < now - 0.05) this.next = now // the tab was asleep: don't burst through missed steps
    const pattern = arpPattern(this.pool, a.mode, this.octaves())
    while (this.next < now + LOOKAHEAD) {
      const i = a.mode === 'random' ? (this.prevRandom = randomStep(pattern.length, this.prevRandom)) : this.step % pattern.length
      const late = this.step % 2 ? (a.swing ?? 0) * stepSec / 3 : 0
      this.play(pattern[i], this.next + late, Math.min(stepSec * Math.max(0.05, a.gate), stepSec - late), this.vel)
      this.step++
      this.next += stepSec
    }
  }
}

class Performer {
  arp: ArpSettings = { on: false, mode: 'up', rate: 1, octaves: 1, gate: 0.6, latch: false }
  chord: ChordSettings = { on: false, shape: [0, 4, 7] }
  private sounding = new Map<number, number>() // pitch → how many keys are holding it (chord memory overlaps)
  private routed = new Map<number, number[]>() // key → pitches it started directly
  private direct = new Set<number>() // keys played straight through (FX off)
  private keys = new Arp({
    settings: () => this.arp, enabled: () => audio.performFx && this.arp.on, octaves: () => this.arp.octaves, expand: (k) => this.expand(k),
    play: (p, t, dur, vel) => audio.schedule(p, t, dur, vel, audio.instrument),
  })
  // Pads take the same speed, pattern, swing and hold; gate and octaves mean nothing to a drum hit.
  private pads = new Arp({
    settings: () => this.arp, enabled: () => audio.performFx && !!this.arp.pads, octaves: () => 1, expand: (k) => [k],
    play: (k, t, _dur, vel) => audio.drum(k, t, vel),
  })

  private get active() { return audio.performFx && (this.arp.on || this.chord.on) }

  configure(arp: ArpSettings, chord: ChordSettings) {
    const wasArp = this.arp.on, wasPads = this.arp.pads
    this.arp = arp
    this.chord = chord
    if (wasArp && !arp.on) this.keys.stop()
    else if (!arp.latch) this.keys.onlyHeld()
    if (wasPads && !arp.pads) this.pads.stop()
    else if (!arp.latch) this.pads.onlyHeld()
  }
  private expand(key: number) { return this.chord.on ? transposeShape(this.chord.shape, key) : [key] }

  noteOn(key: number, vel: number) {
    if (!this.active) { this.direct.add(key); audio.noteOn(key, vel); return }
    if (this.arp.on) { this.keys.press(key, vel); return }
    const notes = this.expand(key)
    this.routed.set(key, notes)
    for (const p of notes) {
      const n = this.sounding.get(p) ?? 0
      this.sounding.set(p, n + 1)
      if (n === 0) audio.noteOn(p, vel)
    }
  }

  noteOff(key: number) {
    if (this.direct.delete(key)) { audio.noteOff(key); return }
    this.keys.release(key)
    const notes = this.routed.get(key)
    if (!notes) return
    this.routed.delete(key)
    for (const p of notes) {
      const n = (this.sounding.get(p) ?? 1) - 1
      if (n > 0) this.sounding.set(p, n)
      else { this.sounding.delete(p); audio.noteOff(p) }
    }
  }

  padDown(k: number, vel: number) {
    if (audio.performFx && this.arp.pads) this.pads.press(k, vel)
    else audio.drum(k, undefined, vel)
  }
  padUp(k: number) { this.pads.release(k) }
}

export const perform = new Performer()
