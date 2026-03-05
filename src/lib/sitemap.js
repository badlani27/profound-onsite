import { isAllowedHost, normalizeUrl } from "./normalizeUrl.js";

const MAX_SITEMAP_FILES = 5;

function extractLocUrls(xml) {
  const matches = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

async function fetchXml(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "llms-txt-generator/1.0" },
      signal: controller.signal
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverUrlsFromSitemap(startUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 9000;
  const maxUrls = options.maxUrls ?? 200;
  const strictHost = options.strictHost ?? false;
  const root = new URL(startUrl);
  const seed = new URL("/sitemap.xml", root).toString();
  const queue = [seed];
  const visitedSitemaps = new Set();
  const urls = new Set();

  while (queue.length > 0 && visitedSitemaps.size < MAX_SITEMAP_FILES && urls.size < maxUrls) {
    const sitemapUrl = queue.shift();
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    const xml = await fetchXml(sitemapUrl, timeoutMs);
    if (!xml) continue;

    const locs = extractLocUrls(xml);
    for (const loc of locs) {
      let parsed;
      try {
        parsed = new URL(loc);
      } catch {
        continue;
      }

      if (!["http:", "https:"].includes(parsed.protocol)) continue;
      if (!isAllowedHost(parsed.hostname, root.hostname, strictHost)) continue;

      if (isSitemapIndex(xml)) {
        if (queue.length < MAX_SITEMAP_FILES && !visitedSitemaps.has(parsed.toString())) {
          queue.push(parsed.toString());
        }
      } else {
        urls.add(normalizeUrl(parsed));
      }
    }
  }

  return [...urls];
}
