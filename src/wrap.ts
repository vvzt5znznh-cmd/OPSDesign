/** Wrap words to lines; split overlong tokens so they stay readable. */
export function wrapLabel(
  text: string,
  maxChars = 16,
  maxLines = 3,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  const flushChunk = (chunk: string) => {
    const next = cur ? `${cur} ${chunk}` : chunk;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = chunk;
    } else {
      cur = next;
    }
  };

  for (const word of words) {
    if (word.length <= maxChars) {
      flushChunk(word);
      continue;
    }
    for (let i = 0; i < word.length; i += maxChars) {
      flushChunk(word.slice(i, i + maxChars));
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    kept[maxLines - 1] =
      last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
    return kept;
  }
  return lines.length ? lines : [""];
}

/** How a milestone/condition label is measured on the picture. */
export const NODE_LABEL = {
  chars: 18,
  maxLines: 8,
  charW: 6.2,
  padX: 10,
  minW: 48,
  lh: 12,
  padY: 6,
  /** Clearance between neighbouring label boxes. */
  gap: 16,
  markToLabel: 14,
};

export function wrapNodeLabel(text: string): string[] {
  return wrapLabel(text, NODE_LABEL.chars, NODE_LABEL.maxLines);
}

export function nodeLabelSize(text: string): {
  lines: string[];
  width: number;
  height: number;
} {
  const lines = wrapNodeLabel(text);
  const maxLen = Math.max(...lines.map((line) => line.length), 4);
  return {
    lines,
    width: Math.max(NODE_LABEL.minW, maxLen * NODE_LABEL.charW + NODE_LABEL.padX),
    height: lines.length * NODE_LABEL.lh + NODE_LABEL.padY,
  };
}
