/** Unicode-aware tokens shared by indexing and searching. */
export function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Allow one typo or transposition for title words. */
export function nearWord(query: string, word: string): boolean {
  if (query.length < 4 || Math.abs(query.length - word.length) > 1)
    return false;
  let i = 0;
  while (i < query.length && query[i] === word[i]) i++;
  if (i === query.length && i === word.length) return true;
  if (query.length === word.length) {
    return (
      query.slice(i + 1) === word.slice(i + 1) ||
      (query[i] === word[i + 1] &&
        query[i + 1] === word[i] &&
        query.slice(i + 2) === word.slice(i + 2))
    );
  }
  const [shorter, longer] =
    query.length < word.length ? [query, word] : [word, query];
  return shorter.slice(i) === longer.slice(i + 1);
}
