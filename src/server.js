import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { crawlWebsite } from "./lib/crawler.js";
import { deriveSiteMetadata, generateLlmsTxt } from "./lib/generator.js";
import { validateLlmsTxt } from "./lib/validator.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function parseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("URL is required");
  }

  const cleaned = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  const parsed = new URL(withProtocol);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  return parsed.toString();
}

function parseCsvPaths(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function parseOptions(body = {}) {
  const maxPages = Number(body.maxPages);
  const maxDepth = Number(body.maxDepth);
  return {
    maxPages: Number.isFinite(maxPages) ? Math.min(Math.max(maxPages, 5), 100) : 30,
    maxDepth: Number.isFinite(maxDepth) ? Math.min(Math.max(maxDepth, 0), 4) : 2,
    timeoutMs: 9000,
    discoveryMode: ["hybrid", "sitemap", "crawl"].includes(body.discoveryMode) ? body.discoveryMode : "hybrid",
    includePaths: parseCsvPaths(body.includePaths),
    excludePaths: parseCsvPaths(body.excludePaths),
    strictHost: Boolean(body.strictHost)
  };
}

app.post("/api/generate", async (req, res) => {
  try {
    const targetUrl = parseUrl(req.body?.url);
    const crawlOptions = parseOptions(req.body);
    const pages = await crawlWebsite(targetUrl, {
      ...crawlOptions
    });

    if (pages.length === 0) {
      return res.status(422).json({
        error:
          "Unable to crawl pages from this website. It may block crawlers or contain no reachable HTML pages."
      });
    }

    const metadata = deriveSiteMetadata(pages, targetUrl);
    const llmsTxt = generateLlmsTxt({
      siteName: metadata.siteName,
      summary: metadata.summary,
      pages
    });
    const report = validateLlmsTxt(llmsTxt);

    return res.json({
      siteName: metadata.siteName,
      pageCount: pages.length,
      llmsTxt,
      pages,
      report
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Failed to generate llms.txt"
    });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`llms.txt generator running on http://localhost:${PORT}`);
});
