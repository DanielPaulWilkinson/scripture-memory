<script setup lang="ts">
import { ref } from 'vue'
import { compare, type Result } from './compare'
import { MODEL_MB, voiceWanted, setVoiceWanted, loadModel, record, transcribe, type Recorder } from './voice'

const props = defineProps<{ text: string; child: boolean }>()
const emit = defineEmits<{ result: [Result] }>()

const wanted = ref(voiceWanted())
const phase = ref<'idle' | 'loading' | 'recording' | 'thinking' | 'done' | 'error'>('idle')
const pct = ref(0); const msg = ref(''); const res = ref<Result | null>(null)
let rec: Recorder | null = null

async function download() {
  phase.value = 'loading'; msg.value = ''
  try { await loadModel(p => (pct.value = p)); setVoiceWanted(true); wanted.value = true; phase.value = 'idle' }
  catch (e) { phase.value = 'error'; msg.value = 'The voice model could not load on this device.' }
}
async function toggle() {
  if (phase.value === 'recording' && rec) {
    phase.value = 'thinking'
    try {
      const said = await transcribe(await rec.stop())
      res.value = compare(props.text, said); phase.value = 'done'; emit('result', res.value)
    } catch { phase.value = 'error'; msg.value = 'Sorry, that did not work. Try again.' }
    rec = null; return
  }
  try { phase.value = 'loading'; await loadModel(p => (pct.value = p)); rec = await record(); res.value = null; phase.value = 'recording' }
  catch { phase.value = 'error'; msg.value = props.child ? 'We need the microphone to listen. That is OK, you can still say it to a grown-up.' : 'Microphone not available. You can still grade yourself.' }
}
function forget() { setVoiceWanted(false); wanted.value = false; phase.value = 'idle'; res.value = null }

const summary = (r: Result) => props.child
  ? (r.suggest === 'good' ? 'Brilliant, you got almost every word!' : r.suggest === 'nearly' ? 'Lovely try, you are nearly there.' : 'Good start. Let us practise it again.')
  : `${r.correct} of ${r.total} words matched.`
</script>

<template>
  <div class="mt-6 border-t border-rule pt-5">
    <template v-if="!wanted">
      <p class="text-moss">{{ child ? 'Want the app to listen and check your words?' : 'Check your recall by voice. Speech is recognised on this device; nothing is sent anywhere.' }}</p>
      <button v-if="phase !== 'loading'" class="mt-3 rounded border border-ink px-5 py-3" @click="download">Download voice model ({{ MODEL_MB }} MB, once)</button>
      <p v-else class="mt-3" role="status">Downloading voice model: {{ pct }}%</p>
    </template>
    <template v-else>
      <button :class="['rounded px-5 py-3', phase === 'recording' ? 'bg-ink text-white' : 'border border-ink']" :aria-pressed="phase === 'recording'"
        :disabled="phase === 'thinking' || phase === 'loading'" @click="toggle">
        <span v-if="phase === 'recording'"><span aria-hidden="true" class="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-rubric align-middle"></span>Listening. Tap to stop</span>
        <span v-else-if="phase === 'thinking'">Checking…</span>
        <span v-else-if="phase === 'loading'">Loading voice model {{ pct }}%</span>
        <span v-else>{{ child ? 'Say it to the app' : 'Say it' }}</span>
      </button>
      <button class="ml-3 text-sm text-moss underline underline-offset-4" @click="forget">Turn off voice</button>
    </template>
    <p v-if="phase === 'error'" class="mt-3" role="alert">{{ msg }}</p>

    <div v-if="res" class="mt-5" aria-live="polite">
      <p class="font-semibold">{{ summary(res) }}</p>
      <p class="mt-3 max-w-[34rem] text-xl leading-[2]">
        <template v-for="(t, i) in res.tokens" :key="i">
          <span v-if="t.mark === 'ok'">{{ t.word }}</span>
          <span v-else-if="t.mark === 'missed'" class="rounded border border-dashed border-rubric px-1 text-rubric"><span class="sr">missed: </span>{{ t.word }}</span>
          <s v-else class="text-moss decoration-2"><span class="sr">extra: </span>+{{ t.word }}</s>
          {{ ' ' }}
        </template>
      </p>
      <p class="mt-2 text-sm text-moss">Key: plain words matched, <span class="rounded border border-dashed border-rubric px-1 text-rubric">boxed</span> words were missed, <s>+struck</s> words were extra. Speech recognition can mishear, so you decide the grade.</p>
    </div>
  </div>
</template>
