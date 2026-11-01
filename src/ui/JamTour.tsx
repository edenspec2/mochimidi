import { useEffect } from 'react'
import type { InstrumentId } from '../audio/audioEngine'
import { Mascot } from './Mascot'
import './JamTour.css'

/** What the guided jam tour can see. `start` is the same picture taken when the current step began. */
export interface TourCtx {
  instrument: InstrumentId
  state: string // Create's transport: 'ready' | 'playing' | 'recording' | …
  loop: boolean
  tracks: number
  heard: number // keys and pads played since the tour began
  taught: boolean // Loop has a keyboard button
  bpm: number
  quantized: number // times Quantize was pressed
  padSounds: number // pads holding the player's own sound
  start: { instrument: InstrumentId; tracks: number; heard: number; loop: boolean; quantized: number; padSounds: number }
}

export interface TourStep {
  target?: string[] // data-tour names of the controls to use; none = play on the keyboard
  title: string
  text: string
  done: (c: TourCtx) => boolean
}

const played = (c: TourCtx, n: number) => c.heard - c.start.heard >= n

export const TOUR: TourStep[] = [
  { target: ['you-play', 'record'], title: 'Pick a sound, then record',
    text: 'Choose a sound in the "You play" list (try Soft strings): it is the sound of your keyboard. Then click ● Record. You will hear 4 clicks counting you in.',
    done: (c) => c.state === 'recording' },
  { title: 'Play your first part',
    text: 'After the clicks, play on your keyboard: hold a chord (C, E and G together), then another one. Keep going for a few bars.',
    done: (c) => c.state === 'recording' && played(c, 6) },
  { target: ['record'], title: 'Stop recording',
    text: 'Click Stop recording. Your part is now saved on the track, with its sound.',
    done: (c) => c.state !== 'recording' },
  { target: ['loop'], title: 'Turn on Loop',
    text: 'Click 🔁 Loop so it says "Loop on". Your part will repeat round and round.',
    done: (c) => c.loop },
  { target: ['play'], title: 'Play the loop',
    text: 'Click ▶ Play (or press Space). Listen to your part going round.',
    done: (c) => c.state === 'playing' },
  { target: ['you-play'], title: 'Pick a second sound',
    text: 'While it plays, open "You play" again and choose a different sound, for example Synth lead.',
    done: (c) => c.instrument !== c.start.instrument },
  { title: 'Play along',
    text: 'Play a melody on your keyboard over the loop. Any notes are fine: you are jamming!',
    done: (c) => played(c, 8) },
  { target: ['add-track'], title: 'Make room for a new layer',
    text: 'Click + Add track. The new track gets your current sound when you record on it.',
    done: (c) => c.tracks > c.start.tracks },
  { target: ['record'], title: 'Record the new layer',
    text: 'Click ● Record. The loop plays, and everything you play now is added on top. Play your melody again.',
    done: (c) => c.state === 'recording' && played(c, 6) },
  { target: ['record'], title: 'Keep the layer',
    text: 'Click Stop recording. Then click ▶ Play to hear both layers together.',
    done: (c) => c.state !== 'recording' },
  { target: ['teach-loop'], title: 'Control it from the keyboard (optional)',
    text: 'Click Teach next to "Loop on / off", then hold Shift on your MiniLab and press pad 1. If nothing happens, try another pad or button.',
    done: (c) => c.taught },
  { title: 'Use your new button',
    text: 'Press that button on your keyboard: Loop switches off. Press it again and it switches back on. No mouse needed!',
    done: (c) => c.loop !== c.start.loop },
]

const stopRecording = (title: string, text: string): TourStep => ({ target: ['record'], title, text, done: (c) => c.state !== 'recording' })
const tightened = (c: TourCtx) => c.quantized > c.start.quantized

/** An original dance track, built layer by layer: a straight beat, a minor bass, off-beat stabs and a spoken word on a pad. */
export const DANCE_TOUR: TourStep[] = [
  { target: ['tempo'], title: 'Set the tempo',
    text: 'Dance tracks sit around 120 beats a minute: slow enough to feel heavy, fast enough to move. Type 120 in Tempo.',
    done: (c) => c.bpm >= 118 && c.bpm <= 126 },
  { target: ['record'], title: 'Start with the beat',
    text: 'Click ● Record. Four clicks count you in, and the clicks keep going so you can stay in time.',
    done: (c) => c.state === 'recording' },
  { title: 'Four on the floor',
    text: 'Hit pad 1 (the kick, or key 1 on the computer) on every click, for 4 bars. Simple and steady: this is the heartbeat of the track.',
    done: (c) => c.state === 'recording' && played(c, 14) },
  stopRecording('Stop recording', 'Click Stop recording. The kick landed on a Drums track of its own.'),
  { target: ['drums-track', 'quantize'], title: 'Tighten the beat',
    text: 'Click the Drums track, then Quantize. Every hit snaps to the beat, so a machine-tight groove comes out of your hands.',
    done: tightened },
  { target: ['loop'], title: 'Turn on Loop',
    text: 'Click 🔁 Loop so it says "Loop on". From now on each layer goes on top while the rest repeats.',
    done: (c) => c.loop },
  { target: ['record'], title: 'Add the clap',
    text: 'Click ● Record. After the count-in, hit pad 5 (the clap) on clicks 2 and 4 of each bar. Boom CLAP boom CLAP.',
    done: (c) => c.state === 'recording' && played(c, 8) },
  { title: 'Add the off-beat hat',
    text: 'Keep going, now with pad 3 (the closed hat) exactly between the kicks: boom tss boom tss. This is what makes people bounce.',
    done: (c) => c.state === 'recording' && played(c, 12) },
  stopRecording('Keep the beat', 'Click Stop recording.'),
  { target: ['quantize'], title: 'Tighten it again',
    text: 'Click Quantize once more, so the clap and hat sit with the kick.',
    done: tightened },
  { target: ['add-track', 'you-play'], title: 'Make room for a bass',
    text: 'Click + Add track, then choose Synth lead under "You play". Press Oct − on your keyboard to reach the low notes.',
    done: (c) => c.tracks > c.start.tracks && c.instrument === 'synth' },
  { target: ['record'], title: 'Play a dark bass',
    text: 'Click ● Record and play one long low note per bar: A, F, C, G. A minor loop like this gives the track its serious mood.',
    done: (c) => c.state === 'recording' && played(c, 4) },
  stopRecording('Keep the bass', 'Click Stop recording when the four notes are down.'),
  { target: ['add-track', 'you-play'], title: 'Make room for chords',
    text: 'Click + Add track, then choose Electric piano under "You play". Press Oct + to come back up.',
    done: (c) => c.tracks > c.start.tracks && c.instrument === 'epiano' },
  { target: ['record'], title: 'Short chord stabs',
    text: 'Click ● Record. Follow the bass with short stabs between the kicks: A C E, then F A C, then C E G, then G B D. Leave gaps: space is what keeps it dark.',
    done: (c) => c.state === 'recording' && played(c, 12) },
  stopRecording('Keep the chords', 'Click Stop recording.'),
  { target: ['sound'], title: 'Put your voice on a pad',
    text: 'Open Sound, then Pad sounds. Press Sample, say one short word of your own, then hit pad 6. Your word is now an instrument. Close the panel afterwards.',
    done: (c) => c.padSounds > c.start.padSounds },
  { target: ['record'], title: 'Drop your voice in',
    text: 'Click ● Record and hit pad 6 at the start of every second bar. Words repeated over a beat are a classic dance hook.',
    done: (c) => c.state === 'recording' && played(c, 2) },
  stopRecording('Finish the track', 'Click Stop recording, then ▶ Play to hear everything together.'),
]

export const TOURS = {
  jam: { steps: TOUR, doneTitle: 'You made a jam!', doneText: 'That is the whole loop: record a part, loop it, play over it, add layers. Save it with Save, or export it as a MIDI file.' },
  dance: { steps: DANCE_TOUR, doneTitle: 'You built a dance track!', doneText: 'Beat, bass, chords and your own voice: that is how these tracks are made. Mute layers to make a quiet break, then bring them back. Save it with Save.' },
}
export type TourId = keyof typeof TOURS

/** The floating coach: one step at a time, the control to press lit up. Steps finish themselves when done. */
export function JamCoach({ tour, step, onStep, onEnd }: { tour: TourId; step: number; onStep: (i: number) => void; onEnd: () => void }) {
  const { steps, doneTitle, doneText } = TOURS[tour]
  const s = steps[step]
  useEffect(() => {
    const els = (s?.target ?? []).map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`)).filter((e) => e !== null)
    els.forEach((e) => e.classList.add('tour-target'))
    els[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return () => els.forEach((e) => e.classList.remove('tour-target'))
  }, [s])

  if (!s) return (
    <div className="tour-coach card" role="dialog" aria-label="Jam tour finished">
      <div className="row" style={{ gap: 10 }}><Mascot size={44} mood="star" /><b>{doneTitle}</b></div>
      <p>{doneText}</p>
      <button className="btn primary" onClick={onEnd}>Finish</button>
    </div>
  )
  return (
    <div className="tour-coach card" role="dialog" aria-label="Jam tour" aria-live="polite">
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <Mascot size={40} mood={s.target ? 'happy' : 'star'} />
        <div className="col" style={{ gap: 0 }}>
          <span className="sub" style={{ fontSize: '0.75rem' }}>Step {step + 1} of {steps.length}{s.target ? '' : ' · on your keyboard 🎹'}</span>
          <b>{s.title}</b>
        </div>
      </div>
      <p>{s.text}</p>
      <div className="row" style={{ gap: 6 }}>
        {step > 0 && <button className="btn small" onClick={() => onStep(step - 1)}>Back</button>}
        <button className="btn small" onClick={() => onStep(step + 1)}>Skip</button>
        <span className="spacer" />
        <button className="btn small ghost" onClick={onEnd} aria-label="End the tour">End tour</button>
      </div>
    </div>
  )
}
