import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { test } from "node:test";
import { load, JSON_SCHEMA } from "js-yaml";

const site = new URL("../_site/", import.meta.url);
const source = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, site), "utf8");
const postFiles = readdirSync(new URL("_posts/", source)).filter((name) => name.endsWith(".md"));
const posts = postFiles.map((name) => {
  const text = readFileSync(new URL(`_posts/${name}`, source), "utf8");
  const data = load(text.split("---")[1], { schema: JSON_SCHEMA });
  const date = data.date.slice(0, 10).replaceAll("-", "/");
  const slug = name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  return { ...data, url: `/${date}/${slug}/` };
});

test("every post retains its publication-date URL and canonical link", () => {
  assert.ok(posts.length >= 152);
  for (const post of posts) {
    const html = read(`${post.url.slice(1)}index.html`);
    assert.ok(html.includes(`rel="canonical" href="https://nvbn.github.io${post.url}"`), post.url);
    assert.ok(html.includes('<article class="post-content">'), post.url);
    assert.ok(!html.startsWith("---"), post.url);
  }
  // Dates that differ from filenames or cross midnight when converted to UTC.
  for (const path of [
    "2019/07/11/classes-with-hooks/index.html",
    "2015/10/08/how-thefuck-works/index.html",
    "2016/02/02/cljs-test-pattern-match/index.html",
  ]) assert.ok(existsSync(new URL(path, site)), path);
});

test("archives contain every post once with working previous and next links", () => {
  const seen = [];
  const pageCount = Math.ceil(posts.length / 10);
  for (let number = 1; number <= pageCount; number++) {
    const html = read(number === 1 ? "index.html" : `page${number}/index.html`);
    const links = [...html.matchAll(/<h2><a href="([^"]+)">/g)].map((match) => match[1]);
    assert.equal(links.length, Math.min(10, posts.length - (number - 1) * 10));
    seen.push(...links);
    const paginator = html.split('<div id="paginator">')[1];
    if (number < pageCount) assert.ok(paginator.includes(`href="/page${number + 1}/"`));
    else assert.ok(!paginator.includes("Older Posts"));
    if (number > 1) assert.ok(paginator.includes(`href="${number === 2 ? "/" : `/page${number - 1}/`}"`));
    else assert.ok(!paginator.includes("Newer Posts"));
  }
  assert.equal(new Set(seen).size, posts.length);
  assert.deepEqual(new Set(seen), new Set(posts.map((post) => post.url)));
  const dates = new Map(posts.map((post) => [post.url, post.date.slice(0, 10)]));
  for (let index = 1; index < seen.length; index++) {
    assert.ok(dates.get(seen[index - 1]) >= dates.get(seen[index]), "Newest posts come first");
  }
});

test("all feeds retain their entries, keyword filtering, and self links", () => {
  for (const keyword of ["", "python", "clojure"]) {
    const name = keyword ? `feed.${keyword}.xml` : "feed.xml";
    const xml = read(name);
    const expected = posts.filter((post) => !keyword || post.keywords?.includes(keyword));
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes(`href="https://nvbn.github.io/${name}" rel="self"`));
    assert.equal([...xml.matchAll(/<item>/g)].length, expected.length);
    for (const post of expected) assert.ok(xml.includes(`<link>https://nvbn.github.io${post.url}</link>`));
    assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(xml));
    assert.ok(xml.includes("&lt;p&gt;"), "Feed descriptions contain escaped HTML");
  }
});

test("sitemap includes posts, archives, and about without source or demo pages", () => {
  const xml = read("sitemap.xml");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, posts.length + Math.ceil(posts.length / 10) + 1);
  assert.equal(new Set(urls).size, urls.length);
  for (const post of posts) assert.ok(urls.includes(`https://nvbn.github.io${post.url}`));
  assert.ok(urls.includes("https://nvbn.github.io/about/"));
  assert.ok(urls.includes(`https://nvbn.github.io/page${Math.ceil(posts.length / 10)}/`));
});

test("static demo assets are copied byte for byte and styles compile", () => {
  for (const file of readdirSync(new URL("assets/", source), { recursive: true })) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const relative = `assets/${file}`;
    assert.deepEqual(readFileSync(new URL(relative, site)), readFileSync(new URL(relative, source)), relative);
  }
  const css = read("css/pixyll.css");
  assert.ok(css.includes(".site-wrap"));
  assert.ok(css.includes(".token.keyword"));
  assert.ok(!css.includes("@use"));
  assert.ok(!existsSync(new URL("package.json", site)));
  assert.ok(!existsSync(new URL("README/index.html", site)));
  assert.ok(read("2019/07/11/classes-with-hooks/index.html").includes('class="token keyword"'));
  assert.ok(read("2016/02/02/cljs-test-pattern-match/index.html").includes('class="token'));
});
