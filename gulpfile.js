"use strict";

let gulp = require('gulp'),
    shell = require('gulp-shell'),
    browserSync = require('browser-sync').create();

gulp.task('build', shell.task(['bundle exec jekyll build --watch']));

gulp.task('serve', () => {
    browserSync.init({
        server: {baseDir: '_site/'},
        open: false
    });
    gulp.watch('_site/20*/**/*.html').on('change', browserSync.reload);
});

gulp.task('default', ['build', 'serve']);
