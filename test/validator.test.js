import test from "node:test";
import assert from "node:assert/strict";
import { validateLlmsTxt } from "../src/lib/validator.js";

test("validateLlmsTxt passes for valid structure", () => {
  const text = `# Example

> Example summary

## Documentation
- [Docs](https://example.com/docs): Main docs
`;

  const report = validateLlmsTxt(text);
  assert.equal(report.pass, true);
});

test("validateLlmsTxt catches duplicate urls", () => {
  const text = `# Example

> Summary

## Documentation
- [Docs](https://example.com/docs)
- [Docs mirror](https://example.com/docs)
`;

  const report = validateLlmsTxt(text);
  const duplicateCheck = report.checks.find((check) => check.id === "duplicates");
  assert.equal(duplicateCheck?.pass, false);
});
