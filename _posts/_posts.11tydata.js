export default {
  tags: ["posts"],
  eleventyComputed: {
    permalink: ({ date, page }) =>
      `/${date.slice(0, 10).replaceAll("-", "/")}/${page.fileSlug}/`,
  },
};
