/** Split so each part is under maxLen UTF-16 code units (Telegram limit is 4096). */
export function splitForTelegram(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxLen, text.length);
    if (end < text.length) {
      const slice = text.slice(i, end);
      const nl = slice.lastIndexOf("\n");
      if (nl > Math.floor(maxLen * 0.5)) {
        end = i + nl + 1;
      }
    }
    parts.push(text.slice(i, end));
    i = end;
  }
  return parts;
}
