// Your own recordings as lessons: a song from Create, marked as a lesson, practised like any piece.
import { detectKey } from '../music/harmony'
import type { Lesson } from '../music/types'
import type { Composition } from '../store/store'

export function lessonFromComposition(c: Composition): Lesson {
  const all = c.tracks.filter((t) => !t.muted).flatMap((t) => t.notes)
  // Start on the bar the playing starts in, so the count-in leads straight into it.
  const shift = Math.floor(Math.min(...all.map((n) => n.start)) / c.timeSig[0]) * c.timeSig[0] || 0
  const notes = all.map((n) => ({ ...n, start: n.start - shift })).sort((a, b) => a.start - b.start)
  const keys = notes.filter((n) => n.drum === undefined)
  const hands = new Set(keys.map((n) => n.hand))
  return {
    id: `own-${c.id}`, stage: 6, kind: 'play', title: c.name,
    goal: 'Your own playing, cleaned up: play it back note for note.',
    intro: ['This is what you recorded in Create. Try Wait mode first, then play along at full speed.'],
    bpm: c.bpm, timeSig: c.timeSig, notes, key: detectKey(keys)?.name,
    hands: hands.size === 2 ? 'both' : hands.has('L') || !keys.length ? 'L' : 'R',
    pass: { minAccuracy: 0.8 },
  }
}
