import { beforeEach, describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ performFx: true, calls: [] as [string, number][] }))
vi.mock('../src/audio/audioEngine', () => ({
  audio: { get performFx() { return fake.performFx }, stripFx: (fx: string, v: number) => { fake.calls.push([fx, v]) } },
}))
import { filterAt, stutterHz, wobbleHz } from '../src/audio/mixFx'
import { chooseStripFx, moveStrip } from '../src/audio/strips'
import { settings } from '../src/store/store'

describe('touch strips', () => {
  beforeEach(() => { fake.performFx = true; fake.calls = []; settings.set({ strips: { pitch: 'filter', mod: 'vibrato' } }) })

  it('play the picked effect in free play', () => {
    moveStrip('pitch', -0.5)
    moveStrip('mod', 0.4)
    expect(fake.calls).toEqual([['filter', -0.5], ['vibrato', 0.4]])
  })

  it('close the filter as the mod strip goes up', () => {
    settings.set({ strips: { pitch: 'bend', mod: 'filter' } })
    moveStrip('mod', 0.6)
    expect(fake.calls).toEqual([['filter', -0.6]])
  })

  it('stay plain bend and vibrato in a lesson', () => {
    fake.performFx = false
    moveStrip('pitch', 0.5)
    moveStrip('mod', 0.2)
    expect(fake.calls).toEqual([['bend', 0.5], ['vibrato', 0.2]])
  })

  it("keep the left strip's effect when it springs back, until it is slid to the middle", () => {
    moveStrip('pitch', -0.7)
    moveStrip('pitch', 0) // let go: the strip jumps home
    moveStrip('pitch', -0.1)
    moveStrip('pitch', -0.01)
    moveStrip('pitch', 0)
    expect(fake.calls).toEqual([['filter', -0.7], ['filter', -0.1], ['filter', -0.01], ['filter', 0]])
  })

  it('let a pitch bend spring back', () => {
    settings.set({ strips: { pitch: 'bend', mod: 'vibrato' } })
    moveStrip('pitch', 0.8)
    moveStrip('pitch', 0)
    expect(fake.calls).toEqual([['bend', 0.8], ['bend', 0]])
  })

  it('turn the old effect off when another is picked', () => {
    chooseStripFx('mod', 'echo')
    expect(fake.calls).toEqual([['vibrato', 0]])
    expect(settings.get().strips.mod).toBe('echo')
  })
})

describe('mix effects', () => {
  it('leave the sound alone with the filter in the middle, and sweep it at the ends', () => {
    expect(filterAt(0)).toEqual({ low: 20000, high: 20, Q: 0 })
    expect(filterAt(-1).low).toBeCloseTo(120)
    expect(filterAt(1).high).toBeCloseTo(4000)
    expect(filterAt(1).low).toBe(20000)
  })

  it('keep wobble and stutter on the tempo', () => {
    expect(wobbleHz(0.1, 120)).toBe(2)
    expect(wobbleHz(0.3, 120)).toBe(4)
    expect(wobbleHz(1, 120)).toBe(8) // the very top stays on sixteenths
    expect(stutterHz(0.2, 120)).toBe(4)
    expect(stutterHz(0.8, 120)).toBe(8)
  })
})
