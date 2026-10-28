<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SayIt from './SayIt.vue'
import type { Result } from './compare'
import { load, save, makeVerse, dueToday, grade, chunks, firstLetters, blanks, today, type Verse, type Grade } from './lib'

const state = ref(load())
watch(state, s => save(s), { deep: true })

const due = computed(() => dueToday(state.value.verses))
const child = computed(() => state.value.child)

const current = ref<Verse | null>(null)
const stage = ref(0)
const shown = ref(false)
const done = ref('')
const heard = ref<Result | null>(null)

const LABEL = { again: 'Not yet', nearly: 'Nearly', good: 'Got it' } as const
const STAGES = computed(() => child.value
  ? ['Read it', 'First letters', 'Fill the gaps', 'More gaps', 'Say it from memory']
  : ['Read and say it', 'First letters only', 'A third blanked', 'Two thirds blanked', 'From the reference'])

const lines = computed(() => {
  if (!current.value) return []
  const cs = chunks(current.value.text)
  if (shown.value || stage.value === 0) return cs
  if (stage.value === 1) return cs.map(firstLetters)
  if (stage.value === 2) return cs.map((c, i) => blanks(c, 1, i))
  if (stage.value === 3) return cs.map((c, i) => blanks(c, 2, i))
  return []
})

function start(v: Verse) { heard.value = null; current.value = v; stage.value = 0; shown.value = false; done.value = ''; window.scrollTo(0, 0) }
function next() { heard.value = null; shown.value = false; stage.value++ }
function mark(g: Grade) {
  if (!current.value) return
  const id = current.value.id
  const upd = grade(current.value, g)
  state.value.verses = state.value.verses.map(v => v.id === id ? upd : v)
  done.value = g === 'good' ? (child.value ? 'Well done! ⭐' : 'Learnt. Next review ' + fmt(upd.due) + '.')
    : g === 'nearly' ? (child.value ? 'Nearly there! Try again soon.' : 'Nearly. Back on ' + fmt(upd.due) + '.')
    : (child.value ? 'Good try! We will practise again tomorrow.' : 'Back tomorrow.')
  current.value = null
}
function fmt(d: string) {
  if (d <= today()) return 'today'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const newRef = ref(''); const newText = ref(''); const adding = ref(false)
function add() {
  if (!newRef.value.trim() || !newText.value.trim()) return
  state.value.verses.push(makeVerse(newRef.value, newText.value))
  newRef.value = ''; newText.value = ''; adding.value = false
}
function remove(v: Verse) {
  if (confirm('Remove ' + v.ref + '?')) state.value.verses = state.value.verses.filter(x => x.id !== v.id)
}
</script>

<template>
  <div :class="['mx-auto max-w-5xl px-5 pb-16 pt-6 md:grid md:grid-cols-[17rem_1fr] md:gap-12 md:pt-12', child ? 'text-[1.15rem]' : '']">
    <header class="md:col-span-2 mb-6 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
      <h1 class="text-2xl"><span class="text-rubric">H</span>ide It</h1>
      <label class="flex items-center gap-2 text-sm text-moss">
        <input type="checkbox" v-model="state.child" class="h-5 w-5 accent-[#A3231B]" />
        Child mode
      </label>
    </header>

    <main class="md:col-start-2 md:row-start-2" id="main">
      <section v-if="current" aria-live="polite">
        <button class="mb-6 text-moss underline underline-offset-4" @click="current = null">Back to today</button>
        <p class="text-rubric text-lg">{{ current.ref }}</p>
        <ol class="mt-2 flex gap-1.5" :aria-label="'Stage ' + (stage + 1) + ' of 5'">
          <li v-for="(s, i) in STAGES" :key="s" :class="['h-1.5 flex-1 rounded-full', i <= stage ? 'bg-rubric' : 'bg-rule']"></li>
        </ol>
        <h2 class="mt-3 text-moss">{{ stage + 1 }} of 5: {{ STAGES[stage] }}</h2>

        <Transition name="fade" mode="out-in">
          <div :key="stage + '-' + shown" class="mt-6 min-h-[10rem]">
            <p v-if="!lines.length" class="text-xl text-moss italic">{{ child ? 'Close your eyes and say it out loud.' : 'Say the whole verse out loud from the reference alone.' }}</p>
            <p v-else :class="[/^[A-Za-z]/.test(lines[0]) ? 'drop' : '', 'max-w-[34rem] leading-[1.65]', child ? 'text-[2.1rem]' : 'text-[1.6rem] md:text-[2.1rem]', stage > 0 && !shown ? 'tracking-wide' : '']">
              <template v-for="(l, i) in lines" :key="i"><span class="block">{{ l }}</span></template>
            </p>
          </div>
        </Transition>

        <p v-if="stage > 0 && !shown" class="mt-4 text-moss">{{ child ? 'Say it out loud, then check.' : 'Say it aloud, then reveal to check.' }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button v-if="stage > 0 && !shown" class="rounded border border-ink px-5 py-3" @click="shown = true">Reveal</button>
          <button v-if="stage < 4" class="rounded bg-rubric px-5 py-3 text-white" @click="next">{{ stage === 0 ? 'I have said it' : 'Next step' }}</button>
        </div>
        <SayIt v-if="stage > 0" :key="current.id + stage" :text="current.text" :child="child" @result="r => heard = r" />
        <fieldset v-if="stage === 4 && shown" class="mt-8 border-t border-rule pt-5">
          <legend class="pt-5 text-lg">{{ child ? 'How did you do?' : 'How well did you recall it?' }}</legend>
          <p v-if="heard" class="mt-2 text-moss">{{ child ? 'The app thinks: ' : 'Voice check suggests: ' }}{{ LABEL[heard.suggest] }}. {{ child ? 'You choose.' : 'Your call.' }}</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button v-for="g in (['again', 'nearly', 'good'] as const)" :key="g"
              :class="['rounded px-5 py-3', g === 'good' ? 'bg-rubric text-white' : 'border border-ink', heard?.suggest === g ? 'ring-2 ring-ink ring-offset-2 ring-offset-linen' : '']"
              @click="mark(g)">{{ LABEL[g] }}<span v-if="heard?.suggest === g"> (suggested)</span></button>
          </div>
        </fieldset>
      </section>

      <section v-else>
        <p v-if="done" class="mb-6 border-l-4 border-rubric pl-4 text-lg" role="status">{{ done }}</p>
        <h2 class="text-[1.9rem] leading-tight md:text-[2.6rem]">
          {{ due.length ? (child ? 'Verses to practise today' : 'Due today') : (child ? 'All done for today!' : 'Nothing due today') }}
        </h2>
        <p class="mt-2 max-w-prose text-moss">{{ due.length ? (child ? 'Pick one and say it out loud.' : 'Two minutes each. Say every step out loud.') : 'Come back tomorrow. Spacing reviews out is what makes them stick.' }}</p>
        <ul class="mt-6 divide-y divide-rule border-y border-rule">
          <li v-for="v in due" :key="v.id">
            <button class="flex w-full items-baseline justify-between gap-4 py-4 text-left" @click="start(v)">
              <span><span class="block text-xl text-rubric">{{ v.ref }}</span><span class="line-clamp-1 text-moss">{{ v.text }}</span></span>
              <span aria-hidden="true" class="text-2xl">›</span>
            </button>
          </li>
        </ul>
      </section>
    </main>

    <aside class="mt-12 md:col-start-1 md:row-start-2 md:mt-0" aria-labelledby="all">
      <h2 id="all" class="text-lg">All verses</h2>
      <ul class="mt-2 text-[0.95rem]">
        <li v-for="v in state.verses" :key="v.id" class="flex items-baseline justify-between gap-2 border-b border-rule py-2">
          <button class="text-left underline-offset-4 hover:underline" @click="start(v)">{{ v.ref }}</button>
          <span class="flex items-baseline gap-3 text-sm text-moss">{{ fmt(v.due) }}
            <button class="min-h-6 min-w-6 px-2 py-1 text-base text-moss" :aria-label="'Remove ' + v.ref" @click="remove(v)">×</button></span>
        </li>
      </ul>
      <button v-if="!adding" class="mt-4 text-rubric underline underline-offset-4" @click="adding = true">Add a verse</button>
      <form v-else class="mt-4 space-y-3" @submit.prevent="add">
        <label class="block">Reference<input v-model="newRef" required placeholder="Romans 8:28" class="mt-1 block w-full rounded border border-moss bg-white px-3 py-2" /></label>
        <label class="block">Verse text<textarea v-model="newText" required rows="4" placeholder="Paste the words here" class="mt-1 block w-full rounded border border-moss bg-white px-3 py-2"></textarea></label>
        <div class="flex gap-3"><button class="rounded bg-rubric px-4 py-2 text-white">Save</button><button type="button" class="px-2" @click="adding = false">Cancel</button></div>
      </form>
      <p class="mt-8 text-sm text-moss">Starter verses are from the King James Version (public domain). Everything stays on this device.</p>
    </aside>
  </div>
</template>
