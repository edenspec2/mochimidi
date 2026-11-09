import type { InputEvent } from '../midi/midiInput'
import { PAD_PITCH } from '../music/drums'
import type { NoteEvent } from '../music/types'

/** Captures key presses as NoteEvents on the session clock (beats). */
export class Recorder {
  notes: NoteEvent[] = []
  private open = new Map<number, NoteEvent>()
  private sustain = false
  private sustained = new Set<NoteEvent>()
  private toBeat: (perfMs: number) => number
  constructor(toBeat: (perfMs: number) => number) { this.toBeat = toBeat }

  input(e: InputEvent) {
    const beat = Math.max(0, this.toBeat(e.time))
    if (e.type === 'on') {
      this.end(e.pitch, beat)
      const n: NoteEvent = { pitch: e.pitch, start: beat, dur: 0, vel: e.vel, hand: e.pitch < 60 ? 'L' : 'R' }
      this.open.set(e.pitch, n)
      this.notes.push(n)
    } else if (e.type === 'off') {
      const n = this.open.get(e.pitch)
      if (!n) return
      this.open.delete(e.pitch)
      if (this.sustain) this.sustained.add(n) // pedal holds the sound: the note lasts until pedal up
      else n.dur = Math.max(0.05, beat - n.start)
    } else if (e.type === 'pad') {
      this.notes.push({ pitch: PAD_PITCH + e.pad, drum: e.pad, start: beat, dur: 0.25, vel: e.vel, hand: 'L' })
    } else if (e.type === 'sustain') {
      // shortcut: pitch-strip and mod-strip movements are not recorded; add automation lanes if takes need them.
      this.sustain = e.down
      if (!e.down) { for (const n of this.sustained) n.dur = Math.max(0.05, beat - n.start); this.sustained.clear() }
    }
  }

  private end(pitch: number, beat: number) {
    const n = this.open.get(pitch)
    if (n) { n.dur = Math.max(0.05, beat - n.start); this.open.delete(pitch) }
    for (const s of this.sustained) if (s.pitch === pitch) { s.dur = Math.max(0.05, beat - s.start); this.sustained.delete(s) }
  }

  /** Close hanging notes and return the take. */
  stop(perfMs: number): NoteEvent[] {
    const beat = this.toBeat(perfMs)
    for (const n of [...this.open.values(), ...this.sustained]) n.dur = Math.max(0.05, beat - n.start)
    this.open.clear(); this.sustained.clear()
    return this.notes
  }
}

/**
 * Snap onsets to `grid` beats (0.25 = sixteenths). `strength` 0..1 moves notes part of the way, keeping feel.
 * Durations snap too but never below one grid step.
 */
export function quantize(notes: NoteEvent[], grid: number, strength = 1): NoteEvent[] {
  return notes.map((n) => {
    const qs = Math.round(n.start / grid) * grid
    const start = n.start + (qs - n.start) * strength
    const qd = Math.max(grid, Math.round(n.dur / grid) * grid)
    return { ...n, start: Math.max(0, start), dur: n.dur + (qd - n.dur) * strength }
  })
}

/**
 * A take made fit to practise: stray touches out (very quiet, or a quick brush of a neighbouring key while a much louder
 * one went down), timing snapped to `grid`, and no key doubled or overlapping itself.
 */
export function cleanTake(notes: NoteEvent[], grid: number): NoteEvent[] {
  const brushed = (n: NoteEvent) => n.dur < 0.5 && notes.some((m) => m !== n && m.drum === undefined && Math.abs(m.pitch - n.pitch) <= 2
    && Math.abs(m.start - n.start) < 0.08 && (m.vel ?? 100) > (n.vel ?? 100) * 1.6)
  const kept = notes.filter((n) => n.drum !== undefined || ((n.vel ?? 100) >= 20 && n.dur >= Math.min(0.1, grid / 2) && !brushed(n)))
  const out: NoteEvent[] = []
  for (const n of quantize(kept, grid).sort((a, b) => a.pitch - b.pitch || a.start - b.start || b.dur - a.dur)) {
    const prev = out.at(-1)
    if (prev?.pitch === n.pitch && prev.start === n.start) continue // the same key twice on one beat: keep the longer
    if (prev?.pitch === n.pitch && prev.drum === undefined && prev.start + prev.dur > n.start) prev.dur = n.start - prev.start
    out.push(n)
  }
  return out.sort((a, b) => a.start - b.start || a.pitch - b.pitch)
}
