import { pathToFileURL } from "node:url";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { load, JSON_SCHEMA } from "js-yaml";
import * as sass from "sass";

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  // Keep date strings (including their original timezone) for Jekyll-compatible URLs.
  eleventyConfig.setFrontMatterParsingOptions({
    engines: {
      yaml(source) {
        const data = load(source, { schema: JSON_SCHEMA });
        if (typeof data?.date === "string") {
          data.date = data.date.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T")
            .replace(/\s+([+-]\d{2}:\d{2})$/, "$1");
          if (!/(Z|[+-]\d{2}:\d{2})$/.test(data.date)) data.date += "Z";
        }
        return data;
      },
    },
  });

  eleventyConfig.addGlobalData("site", {
    name: "nvbn blog",
    url: "https://nvbn.github.io",
  });
  eleventyConfig.addLayoutAlias("post", "post.njk");
  eleventyConfig.addLayoutAlias("page", "page.njk");

  eleventyConfig.addPlugin(syntaxHighlight, {
    languages: ["clojure", "ocaml"],
    init({ Prism }) {
      Prism.languages.clojurescript = Prism.languages.clojure;
      Prism.languages.ml = Prism.languages.ocaml;
    },
  });

  eleventyConfig.addFilter("excerpt", (html) => html.split("<!-- more -->")[0]);
  // Some terminal examples contain escape characters forbidden in XML 1.0.
  eleventyConfig.addFilter("xmlText", (text) =>
    text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, ""),
  );
  eleventyConfig.addFilter("dateISO", (date) => String(date).slice(0, 10));
  eleventyConfig.addFilter("dateDisplay", (date) =>
    new Date(`${String(date).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric", timeZone: "UTC",
    }),
  );
  eleventyConfig.addFilter("dateRSS", (date) => new Date(date).toUTCString());
  eleventyConfig.addFilter("feedPosts", (posts, keyword) =>
    [...posts].reverse().filter((post) => !keyword || post.data.keywords?.includes(keyword)),
  );

  for (const asset of ["assets", "js", "favicon.png", "robots.txt"]) {
    eleventyConfig.addPassthroughCopy(asset);
  }
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("test/**");
  eleventyConfig.ignores.add("_sass/**");
  eleventyConfig.ignores.add("assets/**");

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    useLayouts: false,
    compile(source, inputPath) {
      const result = sass.compileString(source, {
        url: pathToFileURL(inputPath),
        loadPaths: ["_sass"],
        style: "compressed",
      });
      this.addDependencies(inputPath, result.loadedUrls);
      return () => result.css;
    },
  });
  eleventyConfig.addWatchTarget("_sass/");

  return {
    dir: { input: ".", output: "_site", includes: "_includes", layouts: "_layouts" },
    templateFormats: ["md", "html", "njk", "scss"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
