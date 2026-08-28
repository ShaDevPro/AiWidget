/**
 * repairMermaidSource — Fix common LLM Mermaid mistakes before render.
 */

const EDGE_REGEX = /(\s*(?:-->|---|---\s*\|[^|]+\|\s*-->|-->\s*\|[^|]+\||-\.->|==>|->)\s*)/;
const NODE_ID = '[A-Za-z0-9_]+';

/** Lines like `C -->|label|` without a target node. */
const INCOMPLETE_LABELED_EDGE = new RegExp(
  `^(${NODE_ID})\\s*(?:-->|---|==>)\\s*\\|([^|]+)\\|\\s*$`,
);

/** Lines like `C -->` without target. */
const INCOMPLETE_EDGE = new RegExp(`^(${NODE_ID})\\s*(?:-->|---|==>|-\\.->|->)\\s*$`);

let autoNodeCounter = 0;

function nextAutoNodeId(): string {
  autoNodeCounter += 1;
  return `_n${autoNodeCounter}`;
}

/**
 * Assainit un segment de nœud Mermaid (ex: `B[Texte avec [crochets] ou : deux-points ]`)
 */
function sanitizeNodeSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return segment;

  // Détection d'un identifiant suivi d'une forme (crochets, parenthèses, accolades)
  // Exemples : `A[Label]`, `B[Label]: suite ]`, `C(Label)`, `D{Question?}`, `E([Pilule])`
  const nodeMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*([\[\(\{>])([\s\S]*)$/);
  if (!nodeMatch) {
    return segment;
  }

  const id = nodeMatch[1];
  const opener = nodeMatch[2];
  let rest = nodeMatch[3].trim();

  // Déterminer le caractère de fermeture attendu
  let closer = ']';
  if (opener === '(') closer = ')';
  else if (opener === '{') closer = '}';
  else if (opener === '>') closer = ']';

  // Si rest se termine par le closer ou un closer égaré
  if (rest.endsWith(closer) || rest.endsWith(']') || rest.endsWith(')')) {
    // Retirer le dernier caractère de fermeture
    rest = rest.slice(0, -1).trim();
  }

  // Nettoyer le contenu du label :
  // 1. Remplacer les guillemets doubles par des apostrophes
  // 2. Remplacer les crochets/accolades internes égarés par des parenthèses
  const cleanLabel = rest
    .replace(/"/g, "'")
    .replace(/[\[\{]/g, '(')
    .replace(/[\]\}]/g, ')')
    .replace(/\s+/g, ' ')
    .trim();

  // Toujours entourer le label de guillemets pour éviter toute erreur de parsing Mermaid
  return `${id}["${cleanLabel || id}"]`;
}

/**
 * Nettoie une ligne de flowchart (partie gauche, flèche, partie droite, étiquettes).
 */
function sanitizeFlowchartLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  // Ligne de flèche incomplète
  let m = trimmed.match(INCOMPLETE_LABELED_EDGE);
  if (m) {
    const id = nextAutoNodeId();
    const cleanLabel = m[2].trim().replace(/"/g, "'");
    return `${sanitizeNodeSegment(m[1])} -->|${cleanLabel}| ${id}["${cleanLabel}"]`;
  }

  m = trimmed.match(INCOMPLETE_EDGE);
  if (m) {
    const id = nextAutoNodeId();
    return `${sanitizeNodeSegment(m[1])} --> ${id}["Fin"]`;
  }

  // Découpage par flèches (ex: A[...] --> B[...])
  const parts = trimmed.split(EDGE_REGEX);
  if (parts.length > 1) {
    const sanitizedParts = parts.map((part, idx) => {
      // Les index impairs sont les séparateurs de flèche
      if (idx % 2 === 1) {
        // Normaliser les flèches simples `->` en `-->`
        let arrow = part.trim();
        if (arrow === '->') arrow = '-->';
        return ` ${arrow} `;
      }
      return sanitizeNodeSegment(part);
    });
    return sanitizedParts.join('');
  }

  // Nœud isolé
  return sanitizeNodeSegment(trimmed);
}

/**
 * Complete dangling edges and normalize risky node labels.
 * Safe to run on already-valid diagrams (no-op for complete syntax).
 */
export function repairMermaidSource(source: string): string {
  autoNodeCounter = 0;
  const lines = source.split('\n');

  let inHeader = true;
  let isFlowchart = false;

  const repaired = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Header / type de diagramme
    if (/^(flowchart|graph)\b/i.test(trimmed)) {
      inHeader = false;
      isFlowchart = true;
      // Normaliser `graph` vers `flowchart` pour une meilleure robustesse
      return trimmed.replace(/^graph\b/i, 'flowchart');
    }

    if (
      /^(sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|timeline|mindmap|quadrantChart|xychart-beta)\b/i.test(
        trimmed,
      )
    ) {
      inHeader = false;
      isFlowchart = false;
      return line;
    }

    if (trimmed.startsWith('%%') || /^(subgraph|end|style|linkStyle|classDef|class)\b/i.test(trimmed)) {
      return line;
    }

    if (isFlowchart || inHeader) {
      return sanitizeFlowchartLine(line);
    }

    return line;
  });

  let result = repaired.join('\n').trim();
  // S'assurer qu'il y a un en-tête valide si manquant
  if (!/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|timeline|mindmap)\b/i.test(result)) {
    result = `flowchart TD\n${result}`;
  }

  return result;
}

/** Fallback d'urgence ultime pour récupérer les liens essentiels en cas d'erreur de parsing */
export function repairMermaidFallback(source: string): string {
  const lines = source.split('\n');
  const cleanLines: string[] = ['flowchart TD'];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('%%') || /^(flowchart|graph|subgraph|end)\b/i.test(t)) continue;

    // Extraire les identifiants et textes même très malformés
    const arrowMatch = t.match(/([A-Za-z0-9_]+)[\s\S]*?(?:-->|---|==>|->)[\s\S]*?([A-Za-z0-9_]+)[\s\S]*/);
    if (arrowMatch) {
      const from = arrowMatch[1];
      const to = arrowMatch[2];
      cleanLines.push(`  ${from}["${from}"] --> ${to}["${to}"]`);
    }
  }

  return cleanLines.length > 1 ? cleanLines.join('\n') : source;
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
