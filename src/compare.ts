export type Mark = 'ok' | 'missed' | 'extra'
export interface Token { word: string; mark: Mark }
export interface Result { tokens: Token[]; correct: number; total: number; score: number; suggest: 'good' | 'nearly' | 'again' }

// Simple KJV to modern equivalents only. Anything else must match.
const EQUIV: Record<string, string> = {
  thee: 'you', thou: 'you', ye: 'you', thy: 'your', thine: 'your',
  hath: 'has', doth: 'does', art: 'are', shalt: 'shall', wilt: 'will',
  unto: 'to', whosoever: 'whoever', whithersoever: 'wherever', begotten: 'begotten',
}
const NUM: Record<string, string> = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' }

export function words(s: string): string[] {
  return s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean)
}
export function norm(w: string): string {
  w = NUM[w] ?? w
  w = EQUIV[w] ?? w
  // Tolerate a simple plural or possessive: 'americans' matches 'american'.
  return w.length > 3 ? w.replace(/'?s$/, '') : w
}

/** Align spoken against target with LCS; returns target order with extras slotted where heard. */
export function compare(target: string, spoken: string): Result {
  const t = words(target), s = words(spoken)
  const tn = t.map(norm), sn = s.map(norm)
  const n = t.length, m = s.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = tn[i] === sn[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const tokens: Token[] = []
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && tn[i] === sn[j]) { tokens.push({ word: t[i], mark: 'ok' }); i++; j++ }
    else if (j < m && (i >= n || L[i][j + 1] > L[i + 1][j])) { tokens.push({ word: s[j], mark: 'extra' }); j++ }
    else { tokens.push({ word: t[i], mark: 'missed' }); i++ }
  }
  const correct = tokens.filter(x => x.mark === 'ok').length
  const extra = tokens.filter(x => x.mark === 'extra').length
  const score = n ? Math.max(0, (correct - extra * 0.5) / n) : 0
  return { tokens, correct, total: n, score, suggest: score >= 0.9 ? 'good' : score >= 0.6 ? 'nearly' : 'again' }
}
