import test from "node:test";
import assert from "node:assert/strict";
import { deriveSiteMetadata, generateLlmsTxt } from "../src/lib/generator.js";

test("deriveSiteMetadata picks root page title and summary", () => {
  const pages = [
    {
      url: "https://example.com/",
      title: "Example Docs",
      description: "Official developer docs"
    }
  ];

  const metadata = deriveSiteMetadata(pages, "https://example.com");
  assert.equal(metadata.siteName, "Example Docs");
  assert.equal(metadata.summary, "Official developer docs");
});

test("generateLlmsTxt includes required heading and documentation section", () => {
  const llms = generateLlmsTxt({
    siteName: "Example",
    summary: "Example summary",
    pages: [{ url: "https://example.com/docs", title: "Docs", description: "Main docs" }]
  });

  assert.match(llms, /^# Example/m);
  assert.match(llms, /## Documentation/);
  assert.match(llms, /\[Docs\]\(https:\/\/example\.com\/docs\): Main docs/);
});

test("generateLlmsTxt dedupes titles, filters utility pages, and truncates descriptions", () => {
  const longText = "A".repeat(260);
  const llms = generateLlmsTxt({
    siteName: "Stanford University",
    summary: "University overview",
    pages: [
      { url: "https://www.stanford.edu/about/administration", title: "Leadership and Governance", description: "Primary leadership page." },
      { url: "https://www.stanford.edu/about/leadership-and-governance", title: "Leadership and Governance", description: "Duplicate title should be removed." },
      { url: "https://www.stanford.edu/search", title: "Search Results", description: "Should be filtered." },
      { url: "https://www.stanford.edu/research", title: "Research", description: longText }
    ]
  });

  assert.doesNotMatch(llms, /\[Search Results\]/);
  assert.equal((llms.match(/\[Leadership and Governance\]/g) || []).length, 1);
  assert.match(llms, /\[Research\]\(https:\/\/www\.stanford\.edu\/research\): A{40,}\.\.\./);
});
