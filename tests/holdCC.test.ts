import { afterEach, describe, expect, it, vi } from 'vitest'
import { holdCC } from '../src/midi/binding'

const cc = (n: number, raw: number) => ({ type: 'cc' as const, cc: n, raw, value: raw / 127, channel: 1, time: 0, source: 't' })

describe('holding a CC button', () => {
  afterEach(() => { vi.useRealTimers() })

  it('fires once held long enough, not on a short click, and leaves other CCs alone', () => {
    vi.useFakeTimers()
    const fire = vi.fn(), hold = holdCC([115], 800, fire)
    expect(hold(cc(115, 127))).toBe(true)
    vi.advanceTimersByTime(300)
    hold(cc(115, 0)) // a click
    vi.advanceTimersByTime(1000)
    expect(fire).not.toHaveBeenCalled()
    hold(cc(115, 127))
    vi.advanceTimersByTime(800)
    expect(fire).toHaveBeenCalledTimes(1)
    expect(hold(cc(74, 127))).toBe(false)
  })
})
