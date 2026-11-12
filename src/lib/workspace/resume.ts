/**
 * Rebuild highlight positions from a saved draft. The server stores evidence
 * as text (attempt_codes.supporting_excerpt), so on resume each snippet is
 * found again in the note. Pure.
 */
import { EXCERPT_SEPARATOR, type EvidenceLink } from "./types";

export function locateEvidence(
  paragraphs: readonly { id: string; text: string }[],
  code: string,
  excerpt: string,
  makeId: () => string,
): EvidenceLink[] {
  const links: EvidenceLink[] = [];
  for (const piece of excerpt.split(EXCERPT_SEPARATOR).map((p) => p.trim()).filter(Boolean)) {
    for (const paragraph of paragraphs) {
      const start = paragraph.text.indexOf(piece);
      if (start === -1) continue;
      links.push({ id: makeId(), code, paragraphId: paragraph.id, start, end: start + piece.length, text: piece });
      break;
    }
  }
  return links;
}
