---
layout:     post
title:      "Little comparison of ways to use Clojure on Android"
date:       2015-06-07 01:02:00
keywords:   clojure, clojurescript, android
---

Not so long ago I started trying to use Clojure for developing for Android, mostly for graphic.
As a test project to run I decided to use [Bocko](https://github.com/mfikes/bocko)
with a few bundled examples.

First of all [I started with ClojureScript](https://github.com/nvbn/bocko-android),
maybe because of expectations of React Native
on Android. I made a port which works from a WebView, calls
proxy object and draws on a SurfaceView, because of that it's possible to use
[figwheel](https://github.com/bhauman/lein-figwheel) for livecoding.
But this method requires a bit of java code, but works fast
(painting appears after some delay, but it's because port isn't optimised, all other variants
uses the same algorithm):

<iframe width="360" height="640" src="https://www.youtube.com/embed/s5BD7IAGGYE" frameborder="0" allowfullscreen></iframe>
<br />

Then [I tried just Clojure](https://github.com/nvbn/bocko-android-clj) with
[Clojure on Android](http://clojure-android.info/), it's a bit slower
and has a long startup time. Also not works with core.async and original Bocko,
because of lack of support of `*.cljc`. But not requires java code. In action:

<iframe width="360" height="640" src="https://www.youtube.com/embed/FInPceRlsSg" frameborder="0" allowfullscreen></iframe>
<br />

Also Clojure on Android affords [Project Skummet](http://clojure-android.info/skummet/)
that drastically improves startup time and performance, but nothing changes with the problem
with third party libs. Looks better:

<iframe width="360" height="640" src="https://www.youtube.com/embed/_jHFVm2UsK8" frameborder="0" allowfullscreen></iframe>
<br />

[Source of the ClojureScript version.](https://github.com/nvbn/bocko-android)

[Source of the Clojure version (configured to work with Skummet).](https://github.com/nvbn/bocko-android-clj)
