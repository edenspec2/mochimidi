import { useEffect, useRef } from 'react'
import { audio } from '../audio/audioEngine'

/** The music as a moving wave: what goes to the speakers, drawn each frame while it is on screen. */
export function Soundwave() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!, g = cv.getContext('2d')!
    let an: AnalyserNode | null = null, frame = 0, scale = 1, theme = '', ink = '', fill = ''
    const data = new Float32Array(2048)
    const draw = () => {
      frame = requestAnimationFrame(draw)
      if (!an && audio.started) { an = audio.ctx.createAnalyser(); an.fftSize = 2048; audio.tap(an) } // before the first tap there is no sound yet
      const dpr = devicePixelRatio || 1, w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr)
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      if (document.documentElement.dataset.theme !== theme) {
        theme = document.documentElement.dataset.theme ?? ''
        const css = getComputedStyle(cv)
        ink = css.getPropertyValue('--ink').trim(); fill = css.getPropertyValue('--accent').trim()
      }
      if (an) an.getFloatTimeDomainData(data); else data.fill(0)
      // Start at a rising zero crossing, so a held note stands still instead of sliding sideways.
      let from = 0
      for (let i = 1; i < 1024; i++) if (data[i - 1] < 0 && data[i] >= 0) { from = i; break }
      let peak = 0
      for (let i = from; i < from + 1024; i++) peak = Math.max(peak, Math.abs(data[i]))
      scale += (0.9 / Math.max(0.15, peak) - scale) * 0.08 // quiet music still fills the strip, without jumping
      g.clearRect(0, 0, w, h)
      g.beginPath()
      for (let i = 0; i <= 256; i++) { const x = (i / 256) * w, y = h / 2 - data[from + i * 4] * scale * (h / 2 - 4); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
      g.lineJoin = 'round'
      g.lineWidth = 7 * dpr; g.strokeStyle = ink; g.stroke() // the ink line under the colour, as everywhere else
      g.lineWidth = 3.5 * dpr; g.strokeStyle = fill; g.stroke()
    }
    draw()
    return () => { cancelAnimationFrame(frame); if (an) audio.untap(an) }
  }, [])
  return <canvas ref={ref} className="soundwave" aria-label="Soundwave of the music" role="img" />
}
