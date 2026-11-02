# nvbn blog

A static blog built with [Eleventy](https://www.11ty.dev/), using Node.js and npm.

## Development

Use Node.js 24 (`nvm use` if you use nvm), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Eleventy. It rebuilds and reloads the browser when
posts, templates, styles, or assets change.

```sh
npm run build  # Generate the static site in _site/
npm test       # Build and check post URLs, pagination, feeds, and assets
```

Posts stay in `_posts/` as Markdown with YAML front matter. Publication dates in
front matter determine the existing `/YYYY/MM/DD/slug/` URLs. Templates use
Nunjucks in `_layouts/` and `_includes/`; Markdown is rendered without template
processing so code examples can contain braces. Styles are compiled with Dart
Sass, and fenced code is highlighted at build time with Prism.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` checks pull requests and builds and
deploys pushes to `master` with Node.js. In the repository's **Settings → Pages**,
set **Source** to **GitHub Actions** once to enable this deployment workflow.
The workflow publishes `_site/` directly, without Jekyll or Ruby.

The main RSS feed, Python/Clojure feeds, sitemap, and ten-post archive pages are
generated during the build. Static files under `assets/` are copied unchanged,
including the embedded demo applications.
