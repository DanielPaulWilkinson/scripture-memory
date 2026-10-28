import { describe, it, expect } from 'vitest'
import { compare, words } from '../src/compare'

const PS = 'Thy word is a lamp unto my feet, and a light unto my path.'
describe('compare', () => {
  it('ignores case and punctuation', () => {
    const r = compare(PS, 'thy word is a lamp unto my feet and a light unto my path')
    expect(r.correct).toBe(r.total); expect(r.suggest).toBe('good')
  })
  it('accepts simple modern equivalents', () => {
    const r = compare(PS, 'Your word is a lamp to my feet and a light to my path')
    expect(r.score).toBe(1)
  })
  it('marks missed words in order', () => {
    const r = compare(PS, 'Thy word is a lamp unto my feet')
    expect(r.tokens.filter(t => t.mark === 'missed').map(t => t.word)).toEqual(['and', 'a', 'light', 'unto', 'my', 'path'])
    expect(r.suggest).toBe('again')
  })
  it('marks extra words', () => {
    const r = compare('I can do all things', 'I can really do all things')
    expect(r.tokens).toContainEqual({ word: 'really', mark: 'extra' })
    expect(r.correct).toBe(5); expect(r.suggest).toBe('good')
  })
  it('handles a swapped word as missed plus extra', () => {
    const r = compare('Be strong and of a good courage', 'Be strong and of good heart')
    expect(r.tokens.find(t => t.mark === 'extra')?.word).toBe('heart')
    expect(r.suggest).toBe('nearly')
  })
  it('does not treat other words as equivalent', () => {
    expect(compare('the LORD thy God', 'the Lord my God').score).toBeLessThan(1)
  })
  it('handles curly quotes and digits', () => {
    expect(words('“Follow me,” he said')).toEqual(['follow', 'me', 'he', 'said'])
    expect(compare('one thing', '1 thing').score).toBe(1)
  })
  it('tolerates a simple plural but not short words', () => {
    expect(compare('fellow Americans', 'fellow American').score).toBe(1)
    expect(compare('his way', 'hi way').score).toBeLessThan(1)
  })
  it('empty speech suggests again', () => {
    expect(compare(PS, '').suggest).toBe('again')
  })
})
