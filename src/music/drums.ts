// The drum kit played by the MiniLab pads (and by drum notes in lessons and compositions).

/** Drum hits live on "pitches" above the MIDI range so the scorer and renderer can treat them like keys without clashing. */
export const PAD_PITCH = 200

export const DRUMS = [
  { name: 'Kick', short: 'K', gm: 36, color: '#ff6a8a' },
  { name: 'Snare', short: 'S', gm: 38, color: '#ffb35e' },
  { name: 'Closed hat', short: 'H', gm: 42, color: '#5ec8ff' },
  { name: 'Open hat', short: 'O', gm: 46, color: '#7ce0ff' },
  { name: 'Clap', short: 'C', gm: 39, color: '#ffe066' },
  { name: 'Low tom', short: 'T', gm: 45, color: '#a98bff' },
  { name: 'High tom', short: 't', gm: 48, color: '#c3a9ff' },
  { name: 'Crash', short: 'X', gm: 49, color: '#5df2a0' },
]

/** Kirtan kit: dholak strokes, hand cymbals and bells. GM notes are the nearest General MIDI percussion for export. */
export const KIRTAN_DRUMS = [
  { name: 'Ge (dholak bass)', short: 'Ge', gm: 64, color: '#ff8a5c' },
  { name: 'Na (dholak open)', short: 'Na', gm: 63, color: '#ffb35e' },
  { name: 'Tin (dholak closed)', short: 'Ti', gm: 62, color: '#ffd28a' },
  { name: 'Ka (slap)', short: 'Ka', gm: 37, color: '#e0a3ff' },
  { name: 'Kartals', short: 'Kt', gm: 54, color: '#ffe066' },
  { name: 'Manjira', short: 'Mj', gm: 81, color: '#5df2a0' },
  { name: 'Ghungroo', short: 'Gh', gm: 70, color: '#7ce0ff' },
  { name: 'Khol (deep)', short: 'Kh', gm: 60, color: '#ff6a8a' },
]
/** Dubstep kit: kick and snare keep their pads, so a beat still works when the kit is swapped. */
export const DUB_DRUMS = [
  { name: 'Sub kick', short: 'K', gm: 35, color: '#ff6a8a' },
  { name: 'Dub snare', short: 'S', gm: 40, color: '#ffb35e' },
  { name: 'Wobble', short: 'W', gm: 41, color: '#a98bff' },
  { name: 'Growl', short: 'G', gm: 43, color: '#c3a9ff' },
  { name: 'Laser', short: 'L', gm: 71, color: '#5ec8ff' },
  { name: 'Sub drop', short: 'D', gm: 45, color: '#7ce0ff' },
  { name: 'Riser', short: 'R', gm: 55, color: '#5df2a0' },
  { name: 'Impact', short: 'I', gm: 57, color: '#ffe066' },
]
/** Epic kit: kick and snare slots again hold a low drum and a snare. */
export const EPIC_DRUMS = [
  { name: 'Taiko', short: 'T', gm: 36, color: '#ff6a8a' },
  { name: 'War snare', short: 'S', gm: 38, color: '#ffb35e' },
  { name: 'Braam', short: 'B', gm: 41, color: '#a98bff' },
  { name: 'Orchestra hit', short: 'O', gm: 43, color: '#c3a9ff' },
  { name: 'Choir', short: 'C', gm: 52, color: '#5ec8ff' },
  { name: 'Thunder', short: 'Th', gm: 45, color: '#7ce0ff' },
  { name: 'Gong', short: 'G', gm: 49, color: '#5df2a0' },
  { name: 'Whoosh', short: 'W', gm: 55, color: '#ffe066' },
]
/** House and techno kit: its hats and clap sit on the standard kit's pads, so a beat carries straight over. */
export const HOUSE_DRUMS = [
  { name: 'Kick', short: 'K', gm: 36, color: '#ff6a8a' },
  { name: 'Rim', short: 'R', gm: 37, color: '#ffb35e' },
  { name: 'Closed hat', short: 'H', gm: 42, color: '#5ec8ff' },
  { name: 'Open hat', short: 'O', gm: 46, color: '#7ce0ff' },
  { name: 'Clap', short: 'C', gm: 39, color: '#ffe066' },
  { name: 'Shaker', short: 'Sh', gm: 70, color: '#a98bff' },
  { name: 'Blip', short: 'B', gm: 76, color: '#c3a9ff' },
  { name: 'Ride', short: 'Rd', gm: 51, color: '#5df2a0' },
]
export type Kit = 'standard' | 'kirtan' | 'dub' | 'epic' | 'house'
/** The kit the pads and drum notes play right now (set from Settings, and by kirtan lessons while they're open). */
export const kit: { id: Kit } = { id: 'standard' }
export const currentDrums = () => ({ standard: DRUMS, kirtan: KIRTAN_DRUMS, dub: DUB_DRUMS, epic: EPIC_DRUMS, house: HOUSE_DRUMS })[kit.id]

/** General MIDI drum note → nearest drum of our kit (for importing channel-10 parts). */
export function gmToDrum(n: number): number {
  const exact = DRUMS.findIndex((d) => d.gm === n)
  if (exact >= 0) return exact
  if (n <= 36) return 0
  if (n === 37 || n === 40) return 1
  if (n === 44) return 2
  if (n === 41 || n === 43) return 5
  if (n === 47 || n === 50) return 6
  return 7 // cymbals and percussion
}

export const isDrum = (pitch: number) => pitch >= PAD_PITCH
export const drumOf = (pitch: number) => pitch - PAD_PITCH
