import { makeVerse, today, type Verse } from './lib'

export const MAX_BYTES = 256 * 1024
export const MAX_VERSES = 200
export const MAX_REF = 60
export const MAX_TEXT = 2000
export const MAX_NAME = 80
export const MAX_DESC = 300
export const MAX_TRANSLATION = 80
export const DECK_HOSTS = ['danielpaulwilkinson.github.io']

export interface Deck { format: 'hide-it-deck'; version: 1; name: string; description?: string; translation: string; verses: Array<{ ref: string; text: string }> }
export type Parsed = { ok: true; deck: Deck } | { ok: false; error: string }

// Strip control characters (keep normal spaces); text is always rendered as plain text by Vue.
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()

function str(v: unknown, max: number, what: string, optional = false): string | Error | undefined {
  if (v === undefined && optional) return undefined
  if (typeof v !== 'string') return new Error(what + ' must be text.')
  const c = clean(v)
  if (!c && !optional) return new Error(what + ' is empty.')
  if (c.length > max) return new Error(what + ' is too long.')
  return c
}

export function parseDeck(raw: string): Parsed {
  if (new TextEncoder().encode(raw).length > MAX_BYTES) return { ok: false, error: 'That file is too big for a deck.' }
  let d: any
  try { d = JSON.parse(raw) } catch { return { ok: false, error: 'That file is not a Hide It deck.' } }
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.format !== 'hide-it-deck') return { ok: false, error: 'That file is not a Hide It deck.' }
  if (d.version !== 1) return { ok: false, error: 'This deck needs a newer version of Hide It.' }
  const name = str(d.name, MAX_NAME, 'Deck name'); if (name instanceof Error) return { ok: false, error: name.message }
  const description = str(d.description, MAX_DESC, 'Description', true); if (description instanceof Error) return { ok: false, error: description.message }
  const translation = str(d.translation, MAX_TRANSLATION, 'Translation'); if (translation instanceof Error) return { ok: false, error: translation.message }
  if (!Array.isArray(d.verses) || !d.verses.length) return { ok: false, error: 'This deck has no verses.' }
  if (d.verses.length > MAX_VERSES) return { ok: false, error: 'This deck has more than ' + MAX_VERSES + ' verses.' }
  const verses: Deck['verses'] = []
  for (const [i, v] of d.verses.entries()) {
    if (!v || typeof v !== 'object') return { ok: false, error: 'Verse ' + (i + 1) + ' is not valid.' }
    const ref = str(v.ref, MAX_REF, 'Verse ' + (i + 1) + ' reference'); if (ref instanceof Error) return { ok: false, error: ref.message }
    const text = str(v.text, MAX_TEXT, 'Verse ' + (i + 1) + ' text'); if (text instanceof Error) return { ok: false, error: text.message }
    verses.push({ ref: ref!, text: text! })
  }
  return { ok: true, deck: { format: 'hide-it-deck', version: 1, name: name!, ...(description ? { description } : {}), translation: translation!, verses } }
}

const key = (ref: string, text: string) => ref.toLowerCase() + '\u0000' + text.replace(/\s+/g, ' ').trim().toLowerCase()

/** Verses from the deck not already present (by ref + text), as fresh cards due today. */
export function newVerses(existing: Verse[], deck: Deck, day = today()): Verse[] {
  const seen = new Set(existing.map(v => key(v.ref, v.text)))
  const out: Verse[] = []
  for (const v of deck.verses) {
    const k = key(v.ref, v.text)
    if (seen.has(k)) continue
    seen.add(k); out.push(makeVerse(v.ref, v.text, day))
  }
  return out
}

/** Only https links to an allowed host. Returns the URL or an error message. */
export function deckUrl(s: string): URL | string {
  let u: URL
  try { u = new URL(s) } catch { return 'That deck link is not valid.' }
  if (u.protocol !== 'https:') return 'Deck links must start with https.'
  if (!DECK_HOSTS.includes(u.hostname)) return 'Hide It can only open deck links from ' + DECK_HOSTS.join(', ') + '.'
  return u
}

export async function fetchDeck(s: string, f: typeof fetch = fetch): Promise<Parsed> {
  const u = deckUrl(s)
  if (typeof u === 'string') return { ok: false, error: u }
  try {
    const r = await f(u.href, { credentials: 'omit', redirect: 'error' })
    if (!r.ok) return { ok: false, error: 'Could not open that deck link.' }
    const len = Number(r.headers.get('content-length') || 0)
    if (len > MAX_BYTES) return { ok: false, error: 'That file is too big for a deck.' }
    return parseDeck(await r.text())
  } catch { return { ok: false, error: 'Could not open that deck link. Check your connection.' } }
}
