import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'fs'
vi.mock('../src/SayIt.vue', () => ({ default: { render: () => null } }))
import App from '../src/App.vue'

const psalm = readFileSync(__dirname + '/decks/psalm-23.json', 'utf8')
const saved = () => JSON.parse(localStorage.getItem('hide-it:v1')!)

describe('import flow', () => {
  beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/') })

  it('file picker asks first, then adds fresh cards and keeps existing data and child mode', async () => {
    localStorage.setItem('hide-it:v1', JSON.stringify({ child: true, verses: [{ id: 'a', ref: 'Psalm 23:1', text: JSON.parse(psalm).verses[0].text, box: 3, due: '2030-01-01' }] }))
    const w = mount(App)
    const input = w.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [new File([psalm], 'p.json', { type: 'application/json' })] })
    await input.trigger('change'); await flushPromises(); await new Promise(r => setTimeout(r, 20)); await flushPromises()
    expect(w.text()).toContain('Add 5 verses from Psalm 23?')
    expect(saved?.()?.verses?.length ?? 1).toBe(1)
    await w.findAll('button').find(b => b.text() === 'Add verses')!.trigger('click'); await flushPromises()
    const s = saved()
    expect(s.child).toBe(true)
    expect(s.verses.length).toBe(6)
    expect(s.verses[0]).toMatchObject({ id: 'a', box: 3 })
    expect(s.verses.slice(1).every((v: any) => v.box === 0)).toBe(true)
    expect(w.text()).toContain('Added 5 verses from Psalm 23.')
  })

  it('?deck= link fetches, confirms, and can be cancelled', async () => {
    history.replaceState(null, '', '/?deck=' + encodeURIComponent('https://danielpaulwilkinson.github.io/projects/hide-it/decks/psalm-23.json'))
    const f = vi.fn(async () => new Response(psalm)); vi.stubGlobal('fetch', f)
    const w = mount(App); await flushPromises()
    expect(f).toHaveBeenCalled()
    expect(location.search).toBe('')
    expect(w.text()).toContain('Add 6 verses from Psalm 23?')
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click'); await flushPromises()
    expect(w.text()).not.toContain('Add 6 verses')
    expect((saved()?.verses ?? []).some((v: any) => v.ref === 'Psalm 23:4')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('rejects a link to another host without fetching', async () => {
    history.replaceState(null, '', '/?deck=https://evil.example/x.json')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const w = mount(App); await flushPromises()
    expect(f).not.toHaveBeenCalled()
    expect(w.text()).toContain('can only open deck links')
    vi.unstubAllGlobals()
  })
})
