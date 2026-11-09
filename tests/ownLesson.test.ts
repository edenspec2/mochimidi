import { describe, expect, it } from 'vitest'
import { cleanTake } from '../src/engine/recorder'
import { lessonFromComposition } from '../src/lessons/own'
import type { NoteEvent } from '../src/music/types'

const n = (pitch: number, start: number, dur: number, vel = 90): NoteEvent => ({ pitch, start, dur, vel, hand: pitch < 60 ? 'L' : 'R' })

describe('cleaning a take', () => {
  it('drops stray touches, snaps to the grid, and keeps chords', () => {
    const take = [
      n(60, 0.04, 0.93), n(64, 0.02, 0.9), n(67, 0.06, 0.95), // a chord, a little loose
      n(65, 0.03, 0.12, 40), // a quick quiet brush next to the loud E
      n(72, 1.1, 0.03), // a touch too short to be a note
      n(72, 2.03, 0.4, 10), // too quiet to be meant
      n(62, 1.96, 0.97), n(62, 2.02, 0.5), // the same key twice on one beat
    ]
    const out = cleanTake(take, 0.5)
    expect(out.map((x) => [x.pitch, x.start, x.dur])).toEqual([[60, 0, 1], [64, 0, 1], [67, 0, 1], [62, 2, 1]])
  })

  it('cuts a note that runs into the next press of the same key', () => {
    expect(cleanTake([n(60, 0, 1.6), n(60, 1, 1)], 0.5).map((x) => [x.start, x.dur])).toEqual([[0, 1], [1, 1]])
  })

  it('keeps notes drawn by hand, which have no velocity', () => {
    expect(cleanTake([{ pitch: 60, start: 0, dur: 1, hand: 'R' }], 0.25)).toHaveLength(1)
  })
})

describe('a song as a lesson', () => {
  it('starts on the bar of the first note, skips muted tracks, and plays both hands when both are there', () => {
    const l = lessonFromComposition({
      id: 'x', name: 'Mine', bpm: 80, timeSig: [4, 4], updated: 0, lesson: true,
      tracks: [
        { id: 'a', name: 'Piano', instrument: 'piano', notes: [n(48, 5, 1), n(64, 6, 1), n(67, 7, 1)] },
        { id: 'b', name: 'Muted', instrument: 'piano', notes: [n(70, 0, 1)], muted: true },
      ],
    })
    expect(l.id).toBe('own-x')
    expect(l.notes.map((x) => x.start)).toEqual([1, 2, 3])
    expect(l.hands).toBe('both')
  })
})
