import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedHost,
  isHtmlLikePath,
  isSameSiteHost,
  normalizeUrl
} from "../src/lib/normalizeUrl.js";

test("normalizeUrl removes hashes and trailing slash", () => {
  const value = normalizeUrl("https://example.com/docs/#intro");
  assert.equal(value, "https://example.com/docs");
});

test("isHtmlLikePath filters static assets", () => {
  assert.equal(isHtmlLikePath(new URL("https://example.com/image.png")), false);
  assert.equal(isHtmlLikePath(new URL("https://example.com/docs/guide")), true);
});

test("isSameSiteHost treats www and apex as same site", () => {
  assert.equal(isSameSiteHost("stanford.edu", "www.stanford.edu"), true);
  assert.equal(isSameSiteHost("docs.example.com", "www.example.com"), false);
});

test("isAllowedHost supports strict and non-strict matching", () => {
  assert.equal(isAllowedHost("www.stanford.edu", "stanford.edu", true), true);
  assert.equal(isAllowedHost("news.stanford.edu", "stanford.edu", true), false);
  assert.equal(isAllowedHost("news.stanford.edu", "stanford.edu", false), true);
});
