/**
 * Turns a browser text Selection into an offset within one chart block's
 * plain text, so it can be stored as {blockId, start, end} and survive a
 * re-render (including one that already contains highlighted <mark> spans).
 */

/** Walks `container`'s text nodes, summing characters up to `node`+`offset`. */
function textOffsetOf(container: Node, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

export interface BlockSelection {
  blockId: string;
  start: number;
  end: number;
  text: string;
}

/**
 * Reads the current window selection and, if it falls entirely inside a
 * single element carrying `data-block-id`, returns its offsets. Returns null
 * for a collapsed selection, a selection spanning multiple blocks, or one
 * outside the chart pane entirely.
 */
export function readBlockSelection(): BlockSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const text = range.toString();
  if (text.trim() === "") return null;

  const startBlock = (range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement)
    ?.closest<HTMLElement>("[data-block-id]");
  const endBlock = (range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement)
    ?.closest<HTMLElement>("[data-block-id]");

  if (!startBlock || !endBlock || startBlock !== endBlock) return null;

  const blockId = startBlock.dataset.blockId;
  if (!blockId) return null;

  const start = textOffsetOf(startBlock, range.startContainer, range.startOffset);
  const end = textOffsetOf(startBlock, range.endContainer, range.endOffset);
  if (end <= start) return null;

  return { blockId, start, end, text };
}

export interface TextSegment {
  text: string;
  /** Present when this run falls inside a linked evidence span. */
  evidenceId?: string;
}

/**
 * Splits `text` into plain and highlighted runs given a set of non-overlapping
 * [start, end) ranges. Overlapping ranges are resolved by start offset, then
 * by whichever was linked first — good enough for a coding practice tool
 * where overlapping evidence on one span is rare and not a correctness issue.
 */
export function splitByRanges(
  text: string,
  ranges: Array<{ id: string; start: number; end: number }>,
): TextSegment[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const range of sorted) {
    const start = Math.max(range.start, cursor);
    const end = Math.min(range.end, text.length);
    if (start >= end) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), evidenceId: range.id });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
