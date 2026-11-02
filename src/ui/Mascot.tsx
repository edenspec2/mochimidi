/** Mochi, the Mochi MIDI mascot: an inked, cel-shaded mochi with big shiny anime eyes and a music-note sprout. Moods follow how a run went. */
export type Mood = 'happy' | 'star' | 'calm'

const INK = '#2b1a4d'
const BODY = 'M6 44 C6 26 18 16 32 16 C46 16 58 26 58 44 C58 54 48 58 32 58 C16 58 6 54 6 44 Z'
const SPARKLE = 'M0 -6 Q.8 -.8 6 0 Q.8 .8 0 6 Q-.8 .8 -6 0 Q-.8 -.8 0 -6 Z'

function Eye({ x, mood }: { x: number; mood: Mood }) {
  if (mood === 'calm') return <path d={`M${x - 6} 40 q6 -7 12 0`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  return (
    <>
      <ellipse cx={x} cy="38" rx="6.4" ry="8" fill={INK} />
      <path d={`M${x - 5.4} 40 a5.4 5.6 0 0 0 10.8 0 q-5.4 -3.2 -10.8 0 Z`} fill={mood === 'star' ? '#ffb703' : '#ff6fb0'} />
      {mood === 'star'
        ? <path d={SPARKLE} transform={`translate(${x} 37)`} fill="#ffffff" />
        : <>
            <circle cx={x + 2} cy="34" r="2.6" fill="#ffffff" />
            <circle cx={x - 2.4} cy="41" r="1.2" fill="#ffffff" />
          </>}
    </>
  )
}

export function Mascot({ size = 40, mood = 'happy', title }: { size?: number; mood?: Mood; title?: string }) {
  const id = `mochi-${mood}`
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs><clipPath id={`${id}-body`}><path d={BODY} /></clipPath></defs>
      {/* music-note sprout */}
      <path d="M33 16 V5 C37 5 41 6 43 10 C39 9 36 9 36 11 V16" fill="#b78bff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="31" cy="15.5" r="3.6" fill="#b78bff" stroke={INK} strokeWidth="1.8" />
      {/* body: flat colour, one hard shadow shape, an ink line round it all */}
      <path d={BODY} fill="#fff4f8" />
      <path d="M58 36 C50 52 28 58 4 50 V62 H62 V36 Z" fill="#ffc4dd" clipPath={`url(#${id}-body)`} />
      <path d={BODY} fill="none" stroke={INK} strokeWidth="2.4" />
      <ellipse cx="17" cy="28" rx="5" ry="2.6" fill="#ffffff" transform="rotate(-28 17 28)" />
      {/* blush: an anime hatch over the cheeks */}
      <ellipse cx="13.5" cy="47" rx="5" ry="3" fill="#ff8fbd" opacity="0.65" />
      <ellipse cx="50.5" cy="47" rx="5" ry="3" fill="#ff8fbd" opacity="0.65" />
      <path d="M11 49 l2 -4 M14 49 l2 -4 M48 49 l2 -4 M51 49 l2 -4" stroke="#e8508f" strokeWidth="1.1" strokeLinecap="round" />
      <Eye x={22} mood={mood} />
      <Eye x={42} mood={mood} />
      {/* mouth */}
      {mood === 'star'
        ? <path d="M27 47 q5 7 10 0 z" fill="#e8508f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        : <path d="M29 48 q3 2.6 6 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />}
      {mood === 'star' && <path d={SPARKLE} transform="translate(56 14) scale(1.1)" fill="#ffd166" stroke={INK} strokeWidth="1" />}
    </svg>
  )
}
