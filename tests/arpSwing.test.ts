import { describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ t: 0, played: [] as { pitch: number; time: number; dur: number }[], hits: [] as { k: number; time?: number; vel: number }[] }))
vi.mock('../src/audio/audioEngine', () => ({
  audio: {
    performFx: true, bpm: 120, instrument: 'piano', now: () => fake.t, noteOn: () => {}, noteOff: () => {},
    schedule: (pitch: number, time: number, dur: number) => { fake.played.push({ pitch, time, dur }) },
    drum: (k: number, time: number | undefined, vel: number) => { fake.hits.push({ k, time, vel }) },
  },
}))
vi.stubGlobal('window', { setInterval: () => 1 })
import { perform } from '../src/audio/perform'

describe('arpeggiator swing', () => {
  it('delays every second step by swing × a third of a step, and ends it before the next step', () => {
    // 120 BPM in 1/8 notes: a step is 0.25 s. Full swing puts the off-beat a third of a step late (a triplet shuffle).
    perform.configure({ on: true, mode: 'up', rate: 1, octaves: 1, gate: 1, latch: false, swing: 1 }, { on: false, shape: [0] })
    perform.noteOn(60, 90)
    perform.noteOn(64, 90)
    const tick = () => (perform as unknown as { keys: { tick: () => void } }).keys.tick()
    for (const t of [0.2, 0.45]) { fake.t = t; tick() }
    const [a, b, c] = fake.played
    expect(a).toEqual({ pitch: 60, time: 0, dur: 0.25 })
    expect(b.pitch).toBe(64)
    expect(b.time).toBeCloseTo(0.25 + 0.25 / 3, 9)
    expect(b.dur).toBeCloseTo(0.25 - 0.25 / 3, 9) // stops as the next on-beat note starts
    expect(c.time).toBeCloseTo(0.5, 9) // on-beat steps stay on the grid
  })
})

describe('pad arp', () => {
  const settings = (pads: boolean, latch = false) => perform.configure({ on: false, mode: 'up', rate: 1, octaves: 3, gate: 0.6, latch, pads }, { on: false, shape: [0] })
  const tickAt = (t: number) => { fake.t = t; (perform as unknown as { pads: { tick: () => void } }).pads.tick() }

  it('plays one hit when off', () => {
    fake.t = 0; fake.hits = []; settings(false)
    perform.padDown(3, 100)
    expect(fake.hits).toEqual([{ k: 3, time: undefined, vel: 100 }])
  })

  it('cycles the held pads at the arp speed, without octaves, and stops when they are let go', () => {
    fake.t = 0; fake.hits = []; settings(true)
    perform.padDown(1, 80)
    perform.padDown(5, 120)
    tickAt(0.2)
    perform.padUp(1)
    tickAt(0.45)
    perform.padUp(5)
    const n = fake.hits.length
    tickAt(1)
    expect(fake.hits.slice(0, 3).map((h) => h.k)).toEqual([1, 5, 5]) // the first hit sounds at once
    expect(fake.hits.every((h) => h.k < 8)).toBe(true)
    expect(fake.hits[0].time).toBe(0)
    expect(fake.hits[1].time).toBeCloseTo(0.25, 9)
    expect(fake.hits[1].vel).toBe(120)
    expect(fake.hits.length).toBe(n)
  })

  it('keeps going under Hold until the Pads button is turned off', () => {
    fake.t = 0; fake.hits = []; settings(true, true)
    perform.padDown(2, 90)
    perform.padUp(2)
    tickAt(0.5)
    expect(fake.hits.length).toBeGreaterThan(1)
    settings(false, true)
    const n = fake.hits.length
    tickAt(1)
    expect(fake.hits.length).toBe(n)
  })
})
