import { describe, expect, it } from 'vitest'
import { DANCE_TOUR, TOUR, type TourCtx } from '../src/ui/JamTour'

type Live = Omit<TourCtx, 'start'>
// What the player does to finish each step, in order (the happy path through the tour).
const ACTIONS: ((c: Live) => Live)[] = [
  (c) => ({ ...c, instrument: 'strings', state: 'recording' }),
  (c) => ({ ...c, heard: c.heard + 6 }),
  (c) => ({ ...c, state: 'ready' }),
  (c) => ({ ...c, loop: true }),
  (c) => ({ ...c, state: 'playing' }),
  (c) => ({ ...c, instrument: 'synth' }),
  (c) => ({ ...c, heard: c.heard + 8 }),
  (c) => ({ ...c, tracks: c.tracks + 1 }),
  (c) => ({ ...c, state: 'recording', heard: c.heard + 6 }),
  (c) => ({ ...c, state: 'ready' }),
  (c) => ({ ...c, taught: true }),
  (c) => ({ ...c, loop: !c.loop }),
]

const idle: Live = { instrument: 'piano', state: 'ready', loop: false, tracks: 1, heard: 0, taught: false, bpm: 90, quantized: 0, padSounds: 0 }
const snap = (c: Live): TourCtx['start'] => ({ instrument: c.instrument, tracks: c.tracks, heard: c.heard, loop: c.loop, quantized: c.quantized, padSounds: c.padSounds })

describe('guided jam tour', () => {
  it('every step waits for its action, and finishes once it is done', () => {
    expect(ACTIONS.length).toBe(TOUR.length)
    let live: Live = { ...idle }
    TOUR.forEach((step, i) => {
      const start = snap(live)
      expect(step.done({ ...live, start }), `step ${i + 1} "${step.title}" finished before the player did anything`).toBe(false)
      live = ACTIONS[i](live)
      expect(step.done({ ...live, start }), `step ${i + 1} "${step.title}" did not finish`).toBe(true)
    })
  })

  it('playing too few notes does not finish a "play" step', () => {
    const live: Live = { ...idle, instrument: 'strings', state: 'recording', heard: 3 }
    expect(TOUR[1].done({ ...live, start: snap({ ...live, heard: 0 }) })).toBe(false)
  })

  it('dance track: every step waits for its action, and finishes once it is done', () => {
    const rec = (n: number) => (c: Live): Live => ({ ...c, state: 'recording', heard: c.heard + n })
    const stop = (c: Live): Live => ({ ...c, state: 'ready' })
    const quantize = (c: Live): Live => ({ ...c, quantized: c.quantized + 1 })
    const actions: ((c: Live) => Live)[] = [
      (c) => ({ ...c, bpm: 120 }), rec(0), rec(16), stop, quantize, (c) => ({ ...c, loop: true }), rec(8), rec(12), stop, quantize,
      (c) => ({ ...c, tracks: c.tracks + 1, instrument: 'synth' }), rec(4), stop,
      (c) => ({ ...c, tracks: c.tracks + 1, instrument: 'epiano' }), rec(12), stop,
      (c) => ({ ...c, padSounds: c.padSounds + 1 }), rec(2), stop,
    ]
    expect(actions.length).toBe(DANCE_TOUR.length)
    let live: Live = { ...idle }
    DANCE_TOUR.forEach((step, i) => {
      const start = snap(live)
      expect(step.done({ ...live, start }), `step ${i + 1} "${step.title}" finished before the player did anything`).toBe(false)
      live = actions[i](live)
      expect(step.done({ ...live, start }), `step ${i + 1} "${step.title}" did not finish`).toBe(true)
    })
  })
})
