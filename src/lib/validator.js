export function validateLlmsTxt(llmsTxt) {
  const lines = llmsTxt.split("\n");
  const checks = [];

  const hasH1 = /^#\s+.+/.test(lines[0] || "");
  const hasSummary = lines.some((line) => /^>\s+.+/.test(line));
  const hasAtLeastOneH2 = lines.some((line) => /^##\s+.+/.test(line));
  const linkLines = lines.filter((line) => /^-\s+\[[^\]]+\]\([^)]+\)(:.*)?$/.test(line));
  const hasLinks = linkLines.length > 0;

  const urls = linkLines
    .map((line) => line.match(/\(([^)]+)\)/)?.[1])
    .filter(Boolean);
  const hasDuplicateUrls = new Set(urls).size !== urls.length;

  checks.push({ id: "h1", label: "Has H1 title", pass: hasH1 });
  checks.push({ id: "summary", label: "Has blockquote summary", pass: hasSummary });
  checks.push({ id: "sections", label: "Has H2 sections", pass: hasAtLeastOneH2 });
  checks.push({ id: "links", label: "Has markdown link list items", pass: hasLinks });
  checks.push({ id: "duplicates", label: "No duplicate URLs in output", pass: !hasDuplicateUrls });

  return {
    pass: checks.every((check) => check.pass),
    checks
  };
}
