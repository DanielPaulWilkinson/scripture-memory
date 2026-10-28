import { describe, it, expect } from 'vitest'
import { chunks, firstLetters, blanks, grade, dueToday, makeVerse, addDays, load, save, STARTERS } from '../src/lib'

describe('text helpers', () => {
  it('chunks at punctuation', () => {
    expect(chunks('Thy word is a lamp unto my feet, and a light unto my path.')).toEqual(['Thy word is a lamp unto my feet,', 'and a light unto my path.'])
  })
  it('keeps first letters and punctuation', () => {
    expect(firstLetters('Thy word is a lamp, unto “my” feet.')).toBe('T w i a l, u “m” f.')
  })
  it('blanks more words at higher levels', () => {
    const l = 'a bb ccc dddd eeeee ffffff'
    const c = (s: string) => (s.match(/_+/g) || []).length
    expect(c(blanks(l, 1))).toBe(2)
    expect(c(blanks(l, 2))).toBe(4)
    expect(c(blanks(l, 3))).toBe(6)
  })
})

describe('schedule', () => {
  const d = '2026-10-28'
  it('good moves up a box and pushes the due date out', () => {
    const v = grade(makeVerse('X', 'y', d), 'good', d)
    expect(v.box).toBe(1); expect(v.due).toBe(addDays(d, 2))
  })
  it('again resets to tomorrow', () => {
    const v = grade({ ...makeVerse('X', 'y', d), box: 4 }, 'again', d)
    expect(v.box).toBe(0); expect(v.due).toBe('2026-10-29')
  })
  it('nearly keeps the box', () => {
    expect(grade({ ...makeVerse('X', 'y', d), box: 3 }, 'nearly', d).box).toBe(3)
  })
  it('lists only due verses', () => {
    const vs = [makeVerse('A', 'a', d), makeVerse('B', 'b', '2026-11-01')]
    expect(dueToday(vs, d).map(v => v.ref)).toEqual(['A'])
  })
})

describe('storage', () => {
  it('seeds KJV starters then round-trips', () => {
    localStorage.clear()
    const s = load(); expect(s.verses).toHaveLength(STARTERS.length)
    save({ ...s, child: true }); expect(load().child).toBe(true)
  })
})
