---
layout:     post
title:      "Add live reloading to Jekyll with Gulp and Browsersync"
date:       2015-06-19 17:53:00
keywords:   jekyll, gulp, browsersync
---

Live reloading is a very useful feature and it's very popular in web development,
but why don't use it for writing blog articles and seeing changes in the real time?

I use [Jekyll](http://jekyllrb.com/) for this blog, and I already familiar
with [Gulp](http://gulpjs.com/) and [Browsersync](http://www.browsersync.io/),
so I decided to use them.
 
First of all,  init a new package and install all dependencies:

```bash
npm init
sudo npm install -g gulp
npm install --save-dev gulp-shell lodash gulp browser-sync
```

And create a `gulpfile.js` with:

```js
var gulp = require('gulp');
var shell = require('gulp-shell');
var browserSync = require('browser-sync').create();

// Task for building blog when something changed:
gulp.task('build', shell.task(['bundle exec jekyll build --watch']));
// Or if you don't use bundle:
// gulp.task('build', shell.task(['jekyll build --watch']));

// Task for serving blog with Browsersync
gulp.task('serve', function () {
    browserSync.init({server: {baseDir: '_site/'}});
    // Reloads page when some of the already built files changed:
    gulp.watch('_site/**/*.*').on('change', browserSync.reload);
});

gulp.task('default', ['build', 'serve']);
```

Then add created files and folders to Jekyll `exclude`, otherwise `gulp`
will found more than one task with the same name. In `_config.yml`:

```
exclude: [node_modules, gulpfile.js]
```

And that's all! For running it:

```bash
gulp
```

In action:

<iframe width="766" height="430" src="https://www.youtube.com/embed/Gxpg6xlxKVg" frameborder="0" allowfullscreen></iframe>
