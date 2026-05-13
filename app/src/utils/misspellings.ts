export function generateMisspellings(word: string, limit = 6): string[] {
  const w = word.toLowerCase().trim();
  if (!w || w.length < 3) return [];
  const seen = new Set<string>([w]);
  const out: string[] = [];
  const add = (variant: string) => {
    if (variant && !seen.has(variant)) {
      seen.add(variant);
      out.push(variant);
    }
  };

  // 1. ie <-> ei swap — classic English error
  for (let i = 0; i < w.length - 1; i++) {
    const pair = w.slice(i, i + 2);
    if (pair === 'ie') add(w.slice(0, i) + 'ei' + w.slice(i + 2));
    if (pair === 'ei') add(w.slice(0, i) + 'ie' + w.slice(i + 2));
  }

  // 2. Double-letter removal (e.g., 'necessary' -> 'necesary')
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1]) {
      add(w.slice(0, i) + w.slice(i + 1));
    }
  }

  // 3. Common false-doubling (e.g., 'necessary' -> 'neccessary')
  const doublable = new Set(['c', 's', 'l', 'm', 'n', 'r', 't', 'p', 'f']);
  for (let i = 1; i < w.length - 1; i++) {
    if (doublable.has(w[i]) && w[i - 1] !== w[i] && w[i + 1] !== w[i]) {
      add(w.slice(0, i) + w[i] + w.slice(i));
    }
  }

  // 4. Adjacent-letter transposition (keystroke order errors, biased to first half)
  const cap = Math.min(w.length - 1, Math.ceil(w.length / 2));
  for (let i = 0; i < cap; i++) {
    if (w[i] !== w[i + 1]) {
      add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }
  }

  // 5. Vowel substitutions (schwa confusions in interior positions)
  const vowelSwaps: Record<string, string[]> = {
    a: ['e'],
    e: ['a', 'i'],
    i: ['e'],
    o: ['u'],
    u: ['o'],
  };
  for (let i = 1; i < w.length - 1; i++) {
    const swaps = vowelSwaps[w[i]];
    if (swaps) {
      for (const s of swaps) add(w.slice(0, i) + s + w.slice(i + 1));
    }
  }

  return out.slice(0, limit);
}
