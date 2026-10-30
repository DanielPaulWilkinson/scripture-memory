import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { parseDeck, newVerses, deckUrl, fetchDeck, MAX_VERSES, MAX_BYTES } from '../src/deck'
import { makeVerse } from '../src/lib'

const good = (o: object = {}) => JSON.stringify({ format: 'hide-it-deck', version: 1, name: 'Test', translation: 'BSB', verses: [{ ref: 'John 11:35', text: 'Jesus wept.' }], ...o })

describe('parseDeck', () => {
  it('accepts a valid deck', () => {
    const r = parseDeck(good({ description: 'd' }))
    expect(r.ok && r.deck.verses).toEqual([{ ref: 'John 11:35', text: 'Jesus wept.' }])
  })
  it('rejects bad format, version, JSON and types', () => {
    expect(parseDeck('nope').ok).toBe(false)
    expect(parseDeck('[]').ok).toBe(false)
    expect(parseDeck(good({ format: 'anki' })).ok).toBe(false)
    expect(parseDeck(good({ version: 2 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer/) })
    expect(parseDeck(good({ name: 5 })).ok).toBe(false)
    expect(parseDeck(good({ translation: '' })).ok).toBe(false)
    expect(parseDeck(good({ verses: [] })).ok).toBe(false)
    expect(parseDeck(good({ verses: [{ ref: 'x' }] })).ok).toBe(false)
    expect(parseDeck(good({ verses: ['x'] })).ok).toBe(false)
  })
  it('rejects oversize decks', () => {
    const vs = Array.from({ length: MAX_VERSES + 1 }, (_, i) => ({ ref: 'R ' + i, text: 't' }))
    expect(parseDeck(good({ verses: vs })).ok).toBe(false)
    expect(parseDeck(good({ name: 'x'.repeat(81) })).ok).toBe(false)
    expect(parseDeck(good({ verses: [{ ref: 'a', text: 'x'.repeat(2001) }] })).ok).toBe(false)
    expect(parseDeck(good({ description: 'x'.repeat(MAX_BYTES) }))).toMatchObject({ ok: false, error: expect.stringMatching(/too big/) })
  })
  it('keeps junk as plain text and strips control characters', () => {
    const r = parseDeck(good({ name: '<img src=x onerror=alert(1)>', verses: [{ ref: 'A\u0000 1:1', text: '<b>hi</b>\u202E\n there' }] }))
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.deck.name).toBe('<img src=x onerror=alert(1)>'); expect(r.deck.verses[0]).toEqual({ ref: 'A 1:1', text: '<b>hi</b> there' }) }
  })
})

describe('newVerses', () => {
  it('skips duplicates by ref and text, within deck and against existing', () => {
    const r = parseDeck(good({ verses: [{ ref: 'John 11:35', text: 'Jesus wept.' }, { ref: 'John 11:35', text: 'Jesus  wept.' }, { ref: 'John 11:35', text: 'Jesus wept (other).' }, { ref: 'Gen 1:1', text: 'In.' }] }))
    if (!r.ok) throw r.error
    const fresh = newVerses([makeVerse('John 11:35', 'Jesus wept.')], r.deck, '2026-10-30')
    expect(fresh.map(v => v.text)).toEqual(['Jesus wept (other).', 'In.'])
    expect(fresh.every(v => v.box === 0 && v.due === '2026-10-30')).toBe(true)
  })
})

describe('deck links', () => {
  it('allows only https on the allowed host', () => {
    expect(deckUrl('http://danielpaulwilkinson.github.io/a.json')).toMatch(/https/)
    expect(deckUrl('https://evil.example/a.json')).toMatch(/only open/)
    expect(deckUrl('javascript:alert(1)')).toBeTypeOf('string')
    expect(deckUrl('https://danielpaulwilkinson.github.io/projects/hide-it/decks/psalm-23.json')).toBeInstanceOf(URL)
  })
  it('fetches and parses, and handles failures', async () => {
    const ok = vi.fn(async () => new Response(good()))
    expect((await fetchDeck('https://danielpaulwilkinson.github.io/d.json', ok as any)).ok).toBe(true)
    expect(ok).toHaveBeenCalledWith('https://danielpaulwilkinson.github.io/d.json', expect.objectContaining({ credentials: 'omit' }))
    expect((await fetchDeck('https://danielpaulwilkinson.github.io/d.json', (async () => new Response('', { status: 404 })) as any)).ok).toBe(false)
    expect((await fetchDeck('https://danielpaulwilkinson.github.io/d.json', (async () => { throw new Error() }) as any)).ok).toBe(false)
    expect((await fetchDeck('https://x.com/d.json', ok as any)).ok).toBe(false)
  })
})

describe('ready-made BSB decks', () => {
  const dir = __dirname + '/decks/'
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  it('has six decks', () => expect(files.length).toBe(6))
  for (const f of files) it(f + ' parses unchanged', () => {
    const raw = readFileSync(dir + f, 'utf8')
    const r = parseDeck(raw)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.deck).toEqual(JSON.parse(raw)); expect(r.deck.translation).toBe('BSB (Berean Standard Bible, public domain)') }
  })
})
