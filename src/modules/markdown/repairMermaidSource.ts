/**
 * repairMermaidSource — Fix common LLM Mermaid mistakes before render.
 */

const EDGE = '(?:-->|---|-\\.->|==>)';
const NODE_ID = '[A-Za-z][A-Za-z0-9_]*';

/** Lines like `C -->|label|` without a target node. */
const INCOMPLETE_LABELED_EDGE = new RegExp(
  `^(${NODE_ID})\\s*${EDGE}\\s*\\|([^|]+)\\|\\s*$`,
);

/** Lines like `C -->` without target. */
const INCOMPLETE_EDGE = new RegExp(`^(${NODE_ID})\\s*${EDGE}\\s*$`);

let autoNodeCounter = 0;

function nextAutoNodeId(): string {
  autoNodeCounter += 1;
  return `_n${autoNodeCounter}`;
}

function quoteLabel(label: string): string {
  const clean = label.trim().replace(/"/g, "'");
  return `["${clean}"]`;
}

/**
 * Complete dangling edges and normalize risky node labels.
 * Safe to run on already-valid diagrams (no-op for complete syntax).
 */
export function repairMermaidSource(source: string): string {
  autoNodeCounter = 0;
  const lines = source.split('\n');

  const repaired = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Header / comment / subgraph — leave as-is
    if (
      /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|subgraph|end|style|linkStyle|class)\b/i.test(
        trimmed,
      ) ||
      trimmed.startsWith('%%')
    ) {
      return line;
    }

    let m = trimmed.match(INCOMPLETE_LABELED_EDGE);
    if (m) {
      const id = nextAutoNodeId();
      const suffix = ` ${id}${quoteLabel(m[2])}`;
      return line.replace(/\s*$/, '') + suffix;
    }

    m = trimmed.match(INCOMPLETE_EDGE);
    if (m) {
      const id = nextAutoNodeId();
      return line.replace(/\s*$/, '') + ` ${id}[Fin]`;
    }

    return line;
  });

  return repaired.join('\n').trim();
}

/** Skip render while the diagram still has obviously incomplete edges (streaming). */
export function isMermaidRenderReady(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) return false;

  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('%%')) continue;
    if (INCOMPLETE_LABELED_EDGE.test(t) || INCOMPLETE_EDGE.test(t)) return false;
  }
  return true;
}
