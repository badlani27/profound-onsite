function sanitizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLen = 200) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}...`;
}

function toLinkTitle(page) {
  const title = sanitizeText(page.title);
  if (title) return title;

  const url = new URL(page.url);
  return url.pathname === "/" ? url.hostname : url.pathname;
}

function isUtilityPage(urlString) {
  const path = new URL(urlString).pathname.toLowerCase();
  return /(^\/search$|^\/contact$|^\/cookie-policy$|^\/site\/(terms|privacy|accessibility)$)/.test(path);
}

function normalizeTitleForDedup(title) {
  return sanitizeText(title).toLowerCase().replace(/\s+/g, " ");
}

function preparePages(pages) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const filtered = [];

  for (const page of pages) {
    if (!page?.url) continue;
    if (isUtilityPage(page.url)) continue;

    const urlKey = page.url;
    const titleKey = normalizeTitleForDedup(page.title || "");

    if (seenUrls.has(urlKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;

    seenUrls.add(urlKey);
    if (titleKey) seenTitles.add(titleKey);
    filtered.push(page);
  }

  return filtered;
}

function pickSectionName(pages) {
  const hasDocsLike = pages.some((page) => {
    const url = page.url.toLowerCase();
    const text = `${page.title || ""} ${page.description || ""}`.toLowerCase();
    return /docs|documentation|api|reference|guide|tutorial/.test(url) || /docs|documentation|api|reference|guide|tutorial/.test(text);
  });

  return hasDocsLike ? "Documentation" : "Key Pages";
}

export function generateLlmsTxt(input) {
  const { siteName, summary, pages } = input;
  const sorted = preparePages([...pages]);

  const core = sorted.slice(0, 12);
  const optional = sorted.slice(12, 24);
  const primarySection = pickSectionName(sorted);

  const lines = [];
  lines.push(`# ${sanitizeText(siteName)}`);
  if (summary) {
    lines.push("");
    lines.push(`> ${sanitizeText(summary)}`);
  }

  lines.push("");
  lines.push(`## ${primarySection}`);
  for (const page of core) {
    const title = toLinkTitle(page);
    const desc = truncateText(sanitizeText(page.description));
    lines.push(`- [${title}](${page.url})${desc ? `: ${desc}` : ""}`);
  }

  if (optional.length > 0) {
    lines.push("");
    lines.push("## Optional");
    for (const page of optional) {
      const title = toLinkTitle(page);
      const desc = truncateText(sanitizeText(page.description));
      lines.push(`- [${title}](${page.url})${desc ? `: ${desc}` : ""}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function deriveSiteMetadata(pages, rootUrl) {
  const root = pages.find((p) => new URL(p.url).pathname === "/") || pages[0];
  const rootHost = new URL(rootUrl).hostname.replace(/^www\./, "");
  const siteName = sanitizeText(root?.title) || rootHost;
  const summary = sanitizeText(root?.description || `Overview of ${rootHost}`);

  return { siteName, summary };
}
