# Automated llms.txt Generator

A web application that crawls a website, extracts key metadata, and generates a spec-aligned `llms.txt` file.

## Objective

Given a website URL, this tool:

1. Discovers important pages (sitemap-first and/or crawl-based).
2. Extracts metadata (title, description, canonical URL, page URL).
3. Produces `llms.txt` output in Markdown format aligned with [llmstxt.org](https://llmstxt.org/).

The app is intentionally small and explainable so architecture and trade-offs are easy to discuss in an interview or technical review.

## Features

- Guided web UI with:
  - simple URL-first flow,
  - optional advanced crawl settings,
  - progress/status messaging,
  - result tabs (`llms.txt Preview`, `Validation`, `Crawled pages`).
- URL normalization that accepts domain-only input (for example `stanford.edu`) and normalizes to HTTPS.
- Crawl discovery modes:
  - `hybrid` (sitemap + crawl fallback),
  - `sitemap`,
  - `crawl`.
- Server-side crawler with:
  - URL normalization + deduplication,
  - host matching controls (`www`/apex handling and strict host option),
  - include/exclude path filters,
  - depth/page limits and timeouts,
  - lightweight `robots.txt` support (`User-agent: *` + `Disallow`).
- Metadata extraction:
  - `<title>`,
  - `<meta name="description">`,
  - canonical URL (`<link rel="canonical">`).
- Relevance scoring and categorization:
  - categories like `docs`, `api`, `company`, `utility`,
  - deterministic ordering (stable by score then URL).
- `llms.txt` generation quality controls:
  - duplicate reduction,
  - utility-page filtering,
  - description truncation,
  - adaptive primary section naming (`Documentation` or `Key Pages`),
  - `Optional` section when appropriate.
- Built-in validation report for generated output:
  - H1 title present,
  - blockquote summary present,
  - H2 sections present,
  - markdown list-link format checks,
  - duplicate URL detection.
- Output actions:
  - copy to clipboard,
  - download generated text file.
- Automated tests with Node test runner.

## Tech Stack

- Node.js 20+
- Express (API + static web app hosting)
- Cheerio (HTML parsing)
- Native `fetch` + `AbortController` for crawling requests
- Node test runner (`node:test`)

## Project Structure

```text
.
├── public/
│   └── index.html          # Frontend UI (workflow, tabs, accessibility)
├── src/
│   ├── server.js           # API routes and request option parsing
│   └── lib/
│       ├── crawler.js      # Crawl traversal, scoring, categorization
│       ├── generator.js    # llms.txt rendering + metadata derivation
│       ├── normalizeUrl.js # URL/host normalization helpers
│       ├── robots.js       # robots.txt parsing and checks
│       ├── sitemap.js      # sitemap.xml URL discovery
│       └── validator.js    # llms.txt format validation checks
├── test/
│   ├── generator.test.js
│   ├── normalizeUrl.test.js
│   └── validator.test.js
├── package.json
├── LICENSE
└── README.md
```

## How It Works

### 1) Input + options

The user provides a URL in the browser UI, and can optionally tune:

- discovery mode (`hybrid`, `sitemap`, `crawl`),
- crawl limits (`maxPages`, `maxDepth`),
- path filters (`includePaths`, `excludePaths`),
- host strictness (`strictHost`).

### 2) Discovery + crawl

`crawlWebsite()`:

- optionally discovers URLs from `/sitemap.xml`,
- crawls internal HTML pages using breadth-first traversal,
- respects lightweight robots disallow rules,
- applies host + path filtering,
- enforces limits and request timeouts.

### 3) Metadata + ranking

For each page:

- extract URL/title/description/canonical,
- classify and score by relevance,
- sort deterministically for stable output.

### 4) llms.txt generation

The formatter produces:

- H1 title,
- optional blockquote summary,
- primary section (`Documentation` or `Key Pages`),
- `Optional` section (when additional links exist).

Each bullet follows:

`- [Link title](url): Optional description`

### 5) Validation report

The API validates generated output and returns a pass/fail checklist shown in the UI.

## Local Setup

### Prerequisites

- Node.js 20 or later
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

### Run in production mode

```bash
npm start
```

### Run tests

```bash
npm test
```

## API

### `POST /api/generate`

Request body:

```json
{
  "url": "stanford.edu",
  "discoveryMode": "hybrid",
  "maxPages": 30,
  "maxDepth": 2,
  "includePaths": "/about,/academics",
  "excludePaths": "/search,/site/privacy",
  "strictHost": false
}
```

Response:

```json
{
  "siteName": "Stanford University",
  "pageCount": 30,
  "llmsTxt": "# Stanford University\n\n> ...",
  "pages": [
    {
      "url": "https://www.stanford.edu/",
      "title": "Stanford University",
      "description": "...",
      "canonical": "https://www.stanford.edu/",
      "category": "company",
      "score": 14
    }
  ],
  "report": {
    "pass": true,
    "checks": [
      { "id": "h1", "label": "Has H1 title", "pass": true }
    ]
  }
}
```

### `GET /health`

Returns:

```json
{ "status": "ok" }
```

## Deployment

This app can be deployed to platforms like Render, Fly.io, Railway, or any Node host.

Live deployment: [https://profound-onsite-5ff4.onrender.com/](https://profound-onsite-5ff4.onrender.com/)

### Example (Render)

1. Push this code to GitHub.
2. Create a new Render Web Service from the repo.
3. Build command:
   - `npm install`
4. Start command:
   - `npm start`
5. Deploy and copy your live URL.

## Submission Checklist (Assignment Deliverables)

- [ ] Live deployed URL
- [ ] GitHub repository with source code
- [ ] Add required collaborators:
  - `chazzhou`
  - `allapk19`
  - `sherman-grewal`
  - `joshuaprunty`
  - `nuarmstrong`
  - `rahibk`
  - `joeydotdev`
  - `kirk-xuhj`
  - `bgaleotti`
  - `fedeya`
- [ ] `README.md` with setup and deployment instructions (this file)
- [ ] Screenshots OR short demo video

## Suggested Screenshots / Demo Coverage

Capture these for submission:

1. Step 1 input state (URL + advanced settings collapsed).
2. Generation in progress (status updates visible).
3. `llms.txt Preview` tab with generated output.
4. `Validation` tab with pass/fail checks.
5. `Crawled pages` tab with category + score columns.
6. Live deployed app URL in browser.

## Design Trade-offs

- **Why server-side crawling:** avoids browser CORS issues and keeps crawling logic centralized.
- **Why hybrid discovery:** combines sitemap speed/coverage with crawl fallback resilience.
- **Why heuristic ranking + categorization:** simple, explainable, and deterministic.
- **Why lightweight robots support:** honors core crawler etiquette without adding heavy parser complexity.
- **Why bounded crawl limits:** predictable latency and safer defaults for public deployment.

## Known Limitations

- JavaScript-heavy SPAs with little server-rendered HTML may yield sparse output.
- `robots.txt` handling is intentionally lightweight (`User-agent: *` + basic `Disallow` matching).
- No authentication/session crawling (public pages only).
- Sitemap parsing is intentionally simple and bounded.

## Future Improvements

- Advanced `robots.txt` support (`Allow` precedence, wildcard rules, crawl-delay).
- Optional llms-full generation mode.
- URL-level include/exclude rule builder in the UI (instead of comma-separated strings).
- Persisted crawl history and project presets.
- More integration tests with fixture sites and snapshot outputs.

## License

This project is licensed under the MIT License. See `LICENSE`.
