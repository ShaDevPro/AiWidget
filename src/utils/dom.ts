export function escapeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function getSafeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}
