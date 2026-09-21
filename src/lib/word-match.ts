/**
 * Word-order prefix matching.
 *
 * The query is split into words in typing order; every query word must match
 * the BEGINNING (spelling prefix) of a distinct word in the target text, and
 * the matched words must appear in the same order.
 *
 * Examples:
 *   matchWords("voo dra", "VOOPOO Drag X2 Pod Kit")  -> true
 *   matchWords("voo dra", "Drag X2 by VOOPOO")        -> false (wrong order)
 *   matchWords("arg g3",  "VooPoo Argus G3 Kit")      -> true
 */
export function matchWords(query: string, text: string): boolean {
  const rawQuery = (query || '').toLowerCase().trim();
  if (!rawQuery) return false;
  const rawText = (text || '').toLowerCase();

  // CJK (e.g. Chinese) has no spaces: fall back to ordered substring matching.
  const hasCjk = /[\u4e00-\u9fa5]/.test(rawQuery);
  if (hasCjk) {
    let idx = 0;
    for (const ch of rawQuery.replace(/\s+/g, '')) {
      idx = rawText.indexOf(ch, idx);
      if (idx === -1) return false;
      idx += 1;
    }
    return true;
  }

  const needles = rawQuery.split(/\s+/).filter(Boolean);

  const words = rawText
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter(Boolean);

  let cursor = 0;
  for (const needle of needles) {
    let found = -1;
    for (let i = cursor; i < words.length; i++) {
      if (words[i].startsWith(needle)) {
        found = i;
        break;
      }
    }
    if (found === -1) return false;
    cursor = found + 1;
  }
  return true;
}
