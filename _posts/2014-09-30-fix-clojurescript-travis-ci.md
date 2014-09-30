---
layout:     post
title:      Fixing StackOverflowError on travis-ci when running clojurescript tests
date:       2014-09-30 19:58:00
keywords:   clojurescript, clojurescript.test, travis-ci, StackOverflowError
---

Recently i received [strange error](https://travis-ci.org/nvbn/subman/builds/33592994#L705)
when running clojurescript tests on travis-ci:

```bash
$ lein2 cljsbuild test
...
Compiling "target/cljs-test.js" failed.
Exception in thread "main" java.lang.StackOverflowError, compiling:(/tmp/form-init311799534829133165.clj:1:89)
	at clojure.lang.Compiler.load(Compiler.java:7142)
	at clojure.lang.Compiler.loadFile(Compiler.java:7086)
	at clojure.main$load_script.invoke(main.clj:274)
	at clojure.main$init_opt.invoke(main.clj:279)
	at clojure.main$initialize.invoke(main.clj:307)
	at clojure.main$null_opt.invoke(main.clj:342)
	at clojure.main$main.doInvoke(main.clj:420)
	at clojure.lang.RestFn.invoke(RestFn.java:421)
	at clojure.lang.Var.invoke(Var.java:383)
	at clojure.lang.AFn.applyToHelper(AFn.java:156)
	at clojure.lang.Var.applyTo(Var.java:700)
	at clojure.main.main(main.java:37)
Caused by: java.lang.StackOverflowError
...
```
But locally all worked ok. And i found simple solution &ndash; increase thread stack size up to 16mb
by adding this line to my [project.clj](https://github.com/nvbn/subman/blob/bcc276d1cb0f088657a5f4d55ad4195d94900eb6/project.clj#L65):

```clojure
:jvm-opts ["-Xss16m"]
```
As a result travis-ci build [succeeded](https://travis-ci.org/nvbn/subman/builds/36685603).
