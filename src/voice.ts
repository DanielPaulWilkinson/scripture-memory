// On-device speech recognition. Nothing leaves the device: model and runtime are served from this app.
export const MODEL = 'Xenova/whisper-tiny.en'
export const MODEL_MB = 63 // runtime 21 MB + model 42 MB
const FLAG = 'hide-it:voice'
const BASE = import.meta.env.BASE_URL

export const voiceWanted = () => localStorage.getItem(FLAG) === '1'
export const setVoiceWanted = (v: boolean) => v ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG)

type ASR = (a: Float32Array) => Promise<{ text: string }>
let asr: Promise<ASR> | null = null

export function loadModel(onProgress?: (pct: number) => void): Promise<ASR> {
  if (asr) return asr
  asr = (async () => {
    const t = await import('@huggingface/transformers')
    t.env.allowRemoteModels = false
    t.env.allowLocalModels = true
    t.env.localModelPath = BASE + 'models/'
    t.env.useBrowserCache = false // the service worker caches the files instead
    const wasm = t.env.backends.onnx.wasm!
    wasm.wasmPaths = BASE + 'ort/'
    wasm.numThreads = 1
    const seen: Record<string, [number, number]> = {}
    const p = await t.pipeline('automatic-speech-recognition', MODEL, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (e: any) => {
        if (e.status === 'progress' && e.total) {
          seen[e.file] = [e.loaded, e.total]
          const v = Object.values(seen); const l = v.reduce((a, b) => a + b[0], 0), tt = v.reduce((a, b) => a + b[1], 0)
          onProgress?.(Math.round((l / tt) * 100))
        }
      },
    })
    return (a: Float32Array) => p(a) as Promise<{ text: string }>
  })()
  asr.catch(() => { asr = null })
  return asr
}

export async function toMono16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  try { return (await ctx.decodeAudioData(buf)).getChannelData(0) } finally { ctx.close() }
}

export interface Recorder { stop: () => Promise<Blob> }
export async function record(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const rec = new MediaRecorder(stream); const parts: Blob[] = []
  rec.ondataavailable = e => parts.push(e.data)
  rec.start()
  return { stop: () => new Promise(res => { rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(new Blob(parts, { type: rec.mimeType })) }; rec.stop() }) }
}

export async function transcribe(blob: Blob): Promise<string> {
  const run = await loadModel()
  const out = await run(await toMono16k(blob))
  return out.text.trim()
}
