---
layout:     post
title:      "Better ClojureScript tests output with Chrome and cljs-devtools"
date:       2016-01-31 03:54:00
keywords:   clojure, clojurescript, chrome, testing
---

For testing ClojureScript code I use [cljs.test](https://github.com/clojure/clojurescript/wiki/Testing)
with [figwheel](https://github.com/bhauman/lein-figwheel). It's very cool, tests runs when
every `.cljs` file changed, but frequently output in DevTools is a mess. And it would be nice to
have highlighted code in expected/actual part. 

Then I found a nice lib &ndash; [cljs-devtools](https://github.com/binaryage/cljs-devtools). For using it
you need to add it [to your project](https://github.com/binaryage/cljs-devtools#integration-in-your-own-project) and
[configure Chrome DevTools](https://github.com/binaryage/cljs-devtools#enable-custom-formatters-in-chrome).
 
It's nice, but it doesn't work with `print`/`println`, only with `console.log`. And only when clojure
data structures passed to `console.log`. `cljs.test` uses `print` and formatters for printing expected/actual. So
we need to hack `cljs.test` a bit. Assume your test runner looks like:
 
```clojure
(ns ^:figwheel-always rerenderer.test
  (:require [cljs.test :refer-macros [run-all-tests]]))

(enable-console-print!)
(run-all-tests #"rerenderer\..*-test")
```

And we need to redefine `cljs/test.print-comparison`:

```clojure
(ns ^:figwheel-always rerenderer.test
  (:require [cljs.test :refer-macros [run-all-tests] :as test]
            [devtools.core :as devtools]))

(enable-console-print!)
(devtools/install!)

(defn print-comparison
  [{:keys [expected actual]}]
  (.log js/console "expected:" expected)
  (.log js/console "  actual:" actual))

(with-redefs [test/print-comparison print-comparison]
  (run-all-tests #"rerenderer\..*-test"))
```

And that's all, example output:

<div style='border: 1px solid #c0c0c0; text-align: center;'><img src='/assets/cljs_devtools_error.png' /></div>
