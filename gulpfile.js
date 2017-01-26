"use strict";

let gulp = require('gulp'),
    shell = require('gulp-shell'),
    browserSync = require('browser-sync').create(),
    lastSync = new Date();

gulp.task('build', shell.task(['bundle exec jekyll build --watch']));

gulp.task('serve', () => {
    browserSync.init({
        server: {baseDir: '_site/'},
        open: false
    });
    gulp.watch('_site/20*/**/*.html').on('change', (event) => {
      const current = new Date();
      if (current - lastSync > 500) {
        lastSync = current;
        browserSync.reload();
      }
    });
});

gulp.task('default', ['build', 'serve']);
