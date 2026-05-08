/**
 * Minimal markdown → HTML renderer.
 * Handles: headings, bold, italic, inline code, bullet lists, horizontal rules, paragraphs.
 * No external dependencies.
 */
export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  function closeList() {
    if (inList) { out.push("</ul>"); inList = false; }
  }

  function inlineFormat(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^---+$/.test(line)) {
      closeList();
      out.push("<hr />");
      continue;
    }

    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { closeList(); out.push(`<h3>${inlineFormat(h3[1])}</h3>`); continue; }

    const h2 = line.match(/^##\s+(.*)/);
    if (h2) { closeList(); out.push(`<h2>${inlineFormat(h2[1])}</h2>`); continue; }

    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { closeList(); out.push(`<h1>${inlineFormat(h1[1])}</h1>`); continue; }

    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineFormat(li[1])}</li>`);
      continue;
    }

    closeList();

    if (line === "") {
      continue;
    }

    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return out.join("\n");
}
