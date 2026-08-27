/**
 * normalizeAssistantMarkdown — Clean common LLM artifacts before render.
 */
import { MailCardRenderer } from '../mail/MailCardRenderer';

export function normalizeAssistantMarkdown(text: string): string {
  let out = text;

  // Strip leaked XML-like system tags (e.g. partial </system_instructions>)
  out = out.replace(/<\/?[\w_-]+>/g, '');
  out = out.replace(/@[\w.-]*system[\w.-]*/gi, '');

  // Collapse excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/** If the model forgot fences, wrap a bare flowchart block. */
export function ensureMermaidFences(text: string): string {
  if (/```\s*mermaid/i.test(text)) return text;

  const flowStart = text.search(/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)\b/im);
  if (flowStart < 0) return text;

  const before = text.slice(0, flowStart).trimEnd();
  const diagram = text.slice(flowStart).trim();
  if (!diagram) return text;

  return before ? `${before}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`` : `\`\`\`mermaid\n${diagram}\n\`\`\``;
}

/** If the model wrote a bare email, wrap it in email fence for MailCardRenderer. */
export function ensureEmailFences(text: string): string {
  if (/```\s*(?:email|mail)/i.test(text)) return text;

  const emailStart = text.search(/^\s*(?:Objet|Subject|الموضوع|Objet du mail)\s*[:：\-]\s*.+/im);
  if (emailStart < 0) return text;

  const before = text.slice(0, emailStart).trimEnd();
  const potentialEmail = text.slice(emailStart).trim();

  if (MailCardRenderer.isEmailText(potentialEmail)) {
    return before ? `${before}\n\n\`\`\`email\n${potentialEmail}\n\`\`\`` : `\`\`\`email\n${potentialEmail}\n\`\`\``;
  }

  return text;
}

export function prepareAssistantMarkdown(text: string): string {
  return ensureEmailFences(ensureMermaidFences(normalizeAssistantMarkdown(text)));
}
