import { parseDocument } from 'htmlparser2';
import type { ChildNode } from 'domhandler';

/**
 * Converts an HTML fragment into clean plain text for PREVIEW surfaces.
 *  • block elements and `<br>` become line breaks;
 *  • `<li>` items get a leading "• ";
 *  • `script`/`style` contents are dropped entirely;
 *  • whitespace is normalized per line and empty lines collapse.
 */
export function htmlToPlainText(source: string | null | undefined): string {
  const trimmed = (source ?? '').trim();
  if (!trimmed) return '';
  if (!trimmed.includes('<') && !trimmed.includes('&')) return normalize(trimmed);
  try {
    const doc = parseDocument(trimmed, { decodeEntities: true });
    const out: string[] = [];
    for (const n of doc.children) visit(n, out);
    return normalize(out.join(''));
  } catch {
    return normalize(trimmed);
  }
}

export const blockTags = new Set([
  'p', 'div', 'section', 'article', 'aside', 'header', 'footer', 'main',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'tr', 'blockquote', 'pre', 'figure', 'figcaption', 'hr',
]);

function visit(node: ChildNode, out: string[]) {
  if (node.type === 'text') {
    out.push((node as any).data ?? '');
    return;
  }
  if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
    const tag = ((node as any).name ?? '').toLowerCase();
    if (tag === 'script' || tag === 'style') return;
    if (tag === 'br') {
      out.push('\n');
      return;
    }
    const isBlock = blockTags.has(tag);
    if (isBlock) out.push('\n');
    if (tag === 'li') out.push('• ');
    for (const c of (node as any).children ?? []) visit(c, out);
    if (isBlock) out.push('\n');
    return;
  }
  for (const c of (node as any).children ?? []) visit(c, out);
}

function normalize(text: string): string {
  return text
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n');
}
