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

let last = 0 // the pitch strip's last position
/** `v`: the pitch strip −1..1, the mod strip 0..1. */
export function moveStrip(strip: Strip, v: number) {
  if (!audio.performFx) { audio.stripFx(strip === 'pitch' ? 'bend' : 'vibrato', v); return }
  const fx = settings.get().strips[strip]
  // The pitch strip springs to the middle when let go, in one jump to exactly 0; a finger sliding back passes small
  // values first. So a jump from far out is a release, and the effect stays until the strip is slid to the middle.
  if (strip === 'pitch' && fx !== 'bend') { if (v === 0 && Math.abs(last) > 0.15) return; last = v }
  audio.stripFx(fx, strip === 'mod' && fx === 'filter' ? -v : v) // the mod strip only goes up: up closes the filter
}

/** Both strips back to no effect, the held one too. */
export function resetStrips() { last = 0; audio.stripsOff() }

export function chooseStripFx(strip: Strip, fx: StripFx) {
  const s = settings.get().strips
  audio.stripFx(s[strip], 0) // a strip left up must not leave its old effect on
  if (strip === 'pitch') last = 0
  settings.set({ strips: { ...s, [strip]: fx } })
}
