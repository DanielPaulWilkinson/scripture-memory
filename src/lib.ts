export interface Verse { id: string; ref: string; text: string; box: number; due: string }
export type Grade = 'again' | 'nearly' | 'good'

export const GAPS = [1, 2, 4, 7, 14, 30, 60]

export const STARTERS: Array<[string, string]> = [
  ['Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.'],
  ['Joshua 1:9', 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'],
  ['Proverbs 3:5-6', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'],
  ['John 3:16', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
  ['Philippians 4:13', 'I can do all things through Christ which strengtheneth me.'],
]

export function today(d = new Date()): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function makeVerse(ref: string, text: string, day = today()): Verse {
  return { id: Math.random().toString(36).slice(2, 10), ref: ref.trim(), text: text.trim().replace(/\s+/g, ' '), box: 0, due: day }
}

/** Split at natural punctuation into phrase-sized chunks. */
export function chunks(text: string): string[] {
  return text.split(/(?<=[,;:.!?])\s+/).map(s => s.trim()).filter(Boolean)
}

/** "Thy word," -> "T w," keeping punctuation. */
export function firstLetters(line: string): string {
  return line.split(' ').map(w => w.replace(/^([^A-Za-z]*)([A-Za-z])[A-Za-z'’-]*/, '$1$2')).join(' ')
}

/** Blank every word whose index hits the pattern for this level (1 = a third, 2 = two thirds, 3 = all). */
export function blanks(line: string, level: number, offset = 0): string {
  return line.split(' ').map((w, i) => {
    const hide = level >= 3 || ((i + offset) % 3) < level
    return hide ? w.replace(/[A-Za-z'’-]+/, m => '_'.repeat(Math.min(m.length, 8))) : w
  }).join(' ')
}

export function grade(v: Verse, g: Grade, day = today()): Verse {
  const box = g === 'good' ? Math.min(v.box + 1, GAPS.length - 1) : g === 'again' ? 0 : v.box
  const gap = g === 'again' ? 1 : GAPS[box]
  return { ...v, box, due: addDays(day, gap) }
}

export function dueToday(vs: Verse[], day = today()): Verse[] {
  return vs.filter(v => v.due <= day).sort((a, b) => a.due.localeCompare(b.due))
}

const KEY = 'hide-it:v1'
export interface Saved { verses: Verse[]; child: boolean }
export function load(store: Storage = localStorage): Saved {
  try {
    const s = JSON.parse(store.getItem(KEY) || 'null')
    if (s && Array.isArray(s.verses)) return { verses: s.verses, child: !!s.child }
  } catch { /* fall through */ }
  return { verses: STARTERS.map(([r, t]) => makeVerse(r, t)), child: false }
}
export function save(s: Saved, store: Storage = localStorage) { store.setItem(KEY, JSON.stringify(s)) }
