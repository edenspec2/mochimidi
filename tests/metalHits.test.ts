import { expect, it, vi } from 'vitest'

// The PC engine's hats: each is rendered once, in its own offline context, and replayed from then on.
const any: any = new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : any), set: () => true, apply: () => any, construct: () => any })
const t = vi.hoisted(() => ({ metal: [] as { context?: unknown }[], offline: [] as unknown[], started: [] as number[] }))
vi.mock('tone', () => {
  const node = function () {
    const self: any = new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : k === 'connect' || k === 'toDestination' || k === 'start' ? () => self : any), set: () => true })
    return self
  }
  const names = ['Synth', 'Compressor', 'WaveShaper', 'StereoWidener', 'Reverb', 'FeedbackDelay', 'Volume', 'Tremolo', 'Gain', 'Phaser', 'Chorus', 'EQ3', 'Filter', 'Distortion', 'Vibrato', 'Sampler', 'MembraneSynth', 'NoiseSynth']
  const raw = {
    currentTime: 0, state: 'suspended', sampleRate: 48000, resume: () => Promise.resolve(),
    createBuffer: (n: number, len: number) => { const c = new Float32Array(len); return { getChannelData: () => c, numberOfChannels: n } },
    createBufferSource: () => ({ connect: () => {}, start: (at: number) => { t.started.push(at) } }),
    createGain: () => ({ gain: { value: 0 }, connect: any, disconnect: any }), createOscillator: () => any, createPeriodicWave: () => any,
  }
  return {
    ...Object.fromEntries(names.map((n) => [n, node])),
    MetalSynth: function (opts: { context?: unknown }) { t.metal.push(opts); return node() },
    OfflineContext: function () {
      const c = { rawContext: { destination: any }, render: () => Promise.resolve({ numberOfChannels: 2, length: 4, sampleRate: 48000, getChannelData: () => new Float32Array(4) }) }
      t.offline.push(c)
      return c
    },
    getDestination: () => any, immediate: () => 0, connect: () => {}, setContext: () => {},
    getContext: () => ({ close: () => Promise.resolve(), rawContext: raw }),
  }
})

it('plays a light tap strong on Light, and keeps soft under hard when As played', async () => {
  const { padGain } = await import('../src/audio/audioEngine')
  const { padVel } = await import('../src/midi/midiInput')
  const db = (rawVel: number, touch: 'light' | 'normal') => 20 * Math.log10(padGain(padVel(rawVel, touch)))
  expect(db(127, 'light')).toBeCloseTo(0, 5)
  expect(db(20, 'light')).toBeGreaterThan(-4)
  expect(db(1, 'light')).toBeGreaterThan(-8)
  expect(db(20, 'normal')).toBeLessThan(-12)
  expect(db(1, 'normal')).toBeGreaterThan(-20) // the floor
})

it('renders each metal hit once, away from the live context, and keeps it when the kit is dropped', async () => {
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'pianoapp.v1.engine' ? 'full' : null), setItem: () => {} })
  const { audio } = await import('../src/audio/audioEngine')
  await audio.start()
  expect(audio.light).toBe(false)
  vi.useFakeTimers()
  audio.drum(2, 1, 100, 'standard')
  audio.drum(2, 2, 100, 'standard')
  await vi.advanceTimersByTimeAsync(0)
  expect(t.metal.length).toBe(3) // closed hat, open hat, crash
  expect(t.metal.map((m) => m.context)).toEqual(t.offline) // never Tone's global context: the kit is built in that one
  expect(t.started).toEqual([1, 2])
  await vi.advanceTimersByTimeAsync(31_000) // the idle kit is dropped
  audio.drum(2, 3, 100, 'standard')
  await vi.advanceTimersByTimeAsync(0)
  expect(t.metal.length).toBe(3)
  expect(t.started).toEqual([1, 2, 3])
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
