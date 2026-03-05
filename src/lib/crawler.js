import * as cheerio from "cheerio";
import { getRobotsRules, isBlockedByRobots } from "./robots.js";
import { isAllowedHost, isHtmlLikePath, normalizeUrl, toAbsoluteUrl } from "./normalizeUrl.js";
import { discoverUrlsFromSitemap } from "./sitemap.js";

function classifyPage(url, title = "", description = "") {
  const path = url.pathname.toLowerCase();
  const text = `${title} ${description}`.toLowerCase();
  if (/api|reference/.test(path) || /api|reference/.test(text)) return "api";
  if (/docs|documentation|guide|tutorial|learn/.test(path) || /docs|documentation|guide|tutorial/.test(text)) return "docs";
  if (/example|samples|demo/.test(path) || /example|sample|demo/.test(text)) return "examples";
  if (/about|company|team|mission|history|leadership|academics|research|product|features|pricing/.test(path)) return "company";
  if (/privacy|terms|cookie|accessibility|policy|search/.test(path)) return "utility";
  return "general";
}

function pageScore(url, title = "", description = "", category = "general") {
  const path = url.pathname.toLowerCase();
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Prioritize pages usually most useful for LLM context.
  if (path === "/") score += 10;
  if (/docs|documentation|guide|tutorial|api|reference/.test(path)) score += 8;
  if (/about|company|team|pricing|product|features|blog/.test(path)) score += 4;
  if (/changelog|release|news|faq|help|support/.test(path)) score += 3;
  if (/api|reference|getting started|quickstart|documentation/.test(text)) score += 5;
  if (category === "utility") score -= 6;
  if (category === "docs" || category === "api") score += 2;

  return score;
}

function extractPageData(url, html) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";

  const category = classifyPage(url, title, description);
  return {
    url: url.toString(),
    title: title || url.hostname,
    description,
    canonical,
    category,
    score: pageScore(url, title, description, category)
  };
}

function matchesPathFilters(url, includePaths, excludePaths) {
  const path = url.pathname.toLowerCase();
  const includeOk =
    includePaths.length === 0 || includePaths.some((pattern) => path.includes(pattern));
  if (!includeOk) return false;
  return !excludePaths.some((pattern) => path.includes(pattern));
}

function collectInternalLinks(url, html, options) {
  const $ = cheerio.load(html);
  const links = [];
  const { rootHost, strictHost, includePaths, excludePaths } = options;

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

    const absolute = toAbsoluteUrl(url, href);
    if (!absolute) return;
    if (!isAllowedHost(absolute.hostname, rootHost, strictHost)) return;
    if (!["http:", "https:"].includes(absolute.protocol)) return;
    if (!isHtmlLikePath(absolute)) return;
    if (!matchesPathFilters(absolute, includePaths, excludePaths)) return;

    links.push(normalizeUrl(absolute));
  });

  return links;
}

export async function crawlWebsite(startUrl, options = {}) {
  const maxPages = options.maxPages ?? 30;
  const maxDepth = options.maxDepth ?? 2;
  const timeoutMs = options.timeoutMs ?? 8000;
  const strictHost = options.strictHost ?? false;
  const discoveryMode = options.discoveryMode ?? "hybrid";
  const includePaths = (options.includePaths ?? []).map((v) => v.toLowerCase());
  const excludePaths = (options.excludePaths ?? []).map((v) => v.toLowerCase());

  const root = new URL(startUrl);
  const rootHost = root.hostname;
  const queue = [];
  const visited = new Set();
  const pages = [];
  const robotsRules = await getRobotsRules(root.toString());

  if (discoveryMode === "sitemap" || discoveryMode === "hybrid") {
    const sitemapUrls = await discoverUrlsFromSitemap(startUrl, {
      timeoutMs,
      maxUrls: maxPages * 5,
      strictHost
    });
    for (const sitemapUrl of sitemapUrls) {
      queue.push({ url: sitemapUrl, depth: 0 });
    }
  }

  if (discoveryMode === "crawl" || queue.length === 0) {
    queue.push({ url: normalizeUrl(root), depth: 0 });
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const { url: currentRaw, depth } = queue.shift();
    if (visited.has(currentRaw)) continue;
    visited.add(currentRaw);

    const currentUrl = new URL(currentRaw);
    if (!matchesPathFilters(currentUrl, includePaths, excludePaths)) continue;
    if (isBlockedByRobots(currentUrl, robotsRules)) continue;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentRaw, {
        headers: { "User-Agent": "llms-txt-generator/1.0" },
        signal: controller.signal
      });
      clearTimeout(timer);

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/html")) continue;

      const finalUrl = new URL(response.url || currentRaw);
      if (!isAllowedHost(finalUrl.hostname, rootHost, strictHost)) continue;
      if (!matchesPathFilters(finalUrl, includePaths, excludePaths)) continue;

      const html = await response.text();
      const page = extractPageData(finalUrl, html);
      pages.push(page);

      if (depth < maxDepth) {
        const links = collectInternalLinks(finalUrl, html, {
          rootHost,
          strictHost,
          includePaths,
          excludePaths
        });
        for (const link of links) {
          if (!visited.has(link)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  pages.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.url.localeCompare(b.url);
  });
  return pages;
}
