// The MiniLab's two touch strips. In free play and Create each plays the effect picked in the Sound panel;
// lessons keep plain bend and vibrato, because some of them teach exactly that.
import { settings } from '../store/store'
import { audio } from './audioEngine'
import type { StripFx } from './mixFx'

export type Strip = 'pitch' | 'mod'
export const STRIP_FX: { id: StripFx; label: string }[] = [
  { id: 'vibrato', label: 'Vibrato' },
  { id: 'filter', label: 'DJ filter' },
  { id: 'echo', label: 'Echo throw' },
  { id: 'wobble', label: 'Wobble' },
  { id: 'stutter', label: 'Stutter' },
  { id: 'bend', label: 'Pitch bend (not piano)' },
]

/** `v`: the pitch strip −1..1, the mod strip 0..1. */
export function moveStrip(strip: Strip, v: number) {
  if (!audio.performFx) { audio.stripFx(strip === 'pitch' ? 'bend' : 'vibrato', v); return }
  const fx = settings.get().strips[strip]
  audio.stripFx(fx, strip === 'mod' && fx === 'filter' ? -v : v) // the mod strip only goes up: up closes the filter
}

export function chooseStripFx(strip: Strip, fx: StripFx) {
  const s = settings.get().strips
  audio.stripFx(s[strip], 0) // a strip left up must not leave its old effect on
  settings.set({ strips: { ...s, [strip]: fx } })
}
