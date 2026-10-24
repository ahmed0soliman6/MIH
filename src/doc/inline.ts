/**
 * inline.ts
 * Bidi-safe inline text processing for mixed Arabic/English content.
 * Wraps Latin phrases in <bdi lang="en" dir="ltr"> to prevent bidi ordering glitches.
 */

/**
 * Checks if a string contains Latin characters (English/medical terms/acronyms).
 */
export function hasLatin(text: string): boolean {
  if (!text) return false;
  // Remove tags and entities so &quot;, &nbsp;, &amp;, etc. don't trigger latin detection
  const stripped = text
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:[a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, '');
  return /[a-zA-Z]/.test(stripped);
}

/**
 * Wraps English/Latin runs in plain text with <bdi lang="en" dir="ltr">...</bdi>.
 * Avoids touching existing HTML tags, attributes, or HTML entities (&amp;, &quot;, &nbsp;, &#...;).
 */
export function wrapBidiInline(text: string): string {
  if (!text || !hasLatin(text)) return text;

  // Split by existing HTML tags and entities to only process pure text nodes
  const parts = text.split(/(<[^>]+>|&(?:[a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g);

  return parts
    .map((part) => {
      if (!part) return '';
      // If it's a tag or entity, return untouched
      if (
        (part.startsWith('<') && part.endsWith('>')) ||
        (part.startsWith('&') && part.endsWith(';'))
      ) {
        return part;
      }

      // Match sequences of Latin words, numbers, and common punctuation inside English terms
      // Example: "Life Support", "ICU / CCU"
      return part.replace(
        /([A-Za-z0-9][A-Za-z0-9\s.,/%()'-]*[A-Za-z0-9]|[A-Za-z0-9])/g,
        (match) => {
          // If the match only contains numbers/spaces without letters, leave untouched
          if (!/[A-Za-z]/.test(match)) return match;
          return `<bdi lang="en" dir="ltr">${match}</bdi>`;
        }
      );
    })
    .join('');
}
