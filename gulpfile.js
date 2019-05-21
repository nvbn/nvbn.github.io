"use strict";

const gulp = require("gulp"),
  shell = require("gulp-shell"),
  browserSync = require("browser-sync").create(),
  lastSync = new Date();

const build = shell.task(["bundle exec jekyll build --watch --incremental"]);

const serve = () => {
  browserSync.init({
    server: { baseDir: "_site/" },
    open: false,
  });
  gulp.watch("_site/20*/**/*.html").on("change", event => {
    const current = new Date();
    if (current - lastSync > 500) {
      lastSync = current;
      browserSync.reload();
    }
  });
};

gulp.task("build", build);

gulp.task("serve", serve);

gulp.task("default", gulp.parallel("build", "serve"));
