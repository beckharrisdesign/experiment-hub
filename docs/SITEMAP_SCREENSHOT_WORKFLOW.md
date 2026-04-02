# Screenshot sitemap workflow (Figma-ready)

Use this workflow to capture a screenshot thumbnail for every page on your
main deployment, then import the dataset into Figma to build a visual sitemap.

## What this generates

Running the capture script outputs:

- `artifacts/site-map/<run>/screenshots/*.png` - one thumbnail per page URL
- `artifacts/site-map/<run>/site-map.json` - full graph data
- `artifacts/site-map/<run>/site-map-figma.csv` - Figma-friendly rows
- `artifacts/site-map/<run>/site-map.mmd` - Mermaid graph
- `artifacts/site-map/<run>/index.html` - local visual index

## 1) Install dependencies

```bash
npm install
```

If Playwright browser downloads are blocked in your environment, use system
Chrome with `--browser-channel chrome` (default) or pass an explicit path via
`--executable-path`.

## 2) Run a rate-limited capture

Recommended safe run for production:

```bash
npm run sitemap:capture -- \
  --base-url https://YOUR_MAIN_DEPLOYMENT_URL \
  --max-pages 1000 \
  --crawl-delay-ms 1500 \
  --timeout-ms 30000 \
  --retries 2 \
  --include-sitemap-seeds true \
  --browser-channel chrome \
  --output-dir artifacts/site-map/main-$(date +%Y%m%d-%H%M%S)
```

Notes:

- `--crawl-delay-ms 1500` is conservative to respect rate limits.
- `--include-sitemap-seeds true` pulls additional pages from `robots.txt` /
  `sitemap.xml` in addition to link crawling.
- If you prefer auto-detection of your hub production deployment URL, omit
  `--base-url` and the script will try GitHub deployment metadata.

## 3) Include pages that are not discoverable by links

For pages not linked in nav/sitemap (for example deep states), create a seed
file with one URL per line:

```txt
# scripts/seed-urls.txt
https://YOUR_MAIN_DEPLOYMENT_URL/experiments/example
https://YOUR_MAIN_DEPLOYMENT_URL/experiments/example/doc/prd
```

Then run:

```bash
npm run sitemap:capture -- \
  --base-url https://YOUR_MAIN_DEPLOYMENT_URL \
  --seed-file scripts/seed-urls.txt \
  --crawl-delay-ms 1500
```

## 4) Bring into Figma

1. Open `site-map-figma.csv` and review node labels/paths.
2. In Figma, create a frame for the sitemap.
3. Place screenshot images from `screenshots/` as node thumbnails.
4. Use `parentUrl` and `depth` from CSV to position nodes and connectors.
5. Keep this sitemap as your source-of-truth board for selecting pages to
   convert into reusable components later via Figma MCP.

## Useful flags

- `--include-path-regex '^/(experiments|workflow|heuristics)'`
- `--exclude-path-regex '^/(api|admin)'`
- `--keep-query-params true` (captures URL variants distinctly)
- `--max-pages 2000`
- `--user-agent 'BHDLabs-SitemapBot/1.0'`

## Troubleshooting

- `ERR_CONNECTION_CLOSED` or `fetch failed` often means network egress policy,
  not script logic. Re-run from an environment that can reach your deployment.
- 401/redirect loops on protected pages: use a `--seed-file` with public pages
  first, then authenticated pages in a separate run after setting auth in the
  browser context (script extension point).
