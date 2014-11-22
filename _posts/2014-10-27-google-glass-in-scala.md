---
layout:     post
title:      Simple application for Google Glass written in scala
date:       2014-10-27 23:11:00
keywords:   scala, android, google glass
---

About a month ago I received Google Glass and only last weekend I found time for
developing something for it. I don't have a lot of experience in developing software for
android, so I've started developing simple TODO application.

As a language I selected scala (but I think I should try to write similar application in clojure)
and gradle as a build system (because it works out of the box with [Android Studio](https://developer.android.com/sdk/installing/studio.html)).

For integrating scala and gradle I've used [gradle-android-scala-plugin](https://github.com/saturday06/gradle-android-scala-plugin)
which works perfectly and requires adding only ~10 lines to `build.gradle` for configuration.

And I used [scaloid](https://github.com/pocorall/scaloid) &mdash;
it's a very great library, it makes work with android API less painful and makes code a bit more Scala-style.

Developing in scala for android is fun, but I stumbled over one not straightforward problem
(perhaps it's straightforward for mature android developers) &mdash; compilation fails with:

```
[info] Generating classes.dex
[warn] 
[warn] trouble writing output: Too many method references: 181232; max is 65536.
[warn] You may try using --multi-dex option.
[warn] References by package:
...
```

And the simple solution &mdash; change my proguard config to:

```
-dontoptimize
-dontobfuscate
-dontpreverify
-dontwarn scala.**
-keep class scala.collection.SeqLike {
    public protected *;
}
-ignorewarnings
```

Another minus it's compile time. My simple application compiles
around 1.5 minutes, tests &mdash; around 1 minute. But I found that incremental compilation
will be available soon in [gradle-android-scala-plugin](https://github.com/saturday06/gradle-android-scala-plugin/issues/30),
so this minus will disappear.

[Source code of result](https://github.com/nvbn/TODOGlass), video of result:

<iframe width="766" height="430" src="//www.youtube.com/embed/Hv-QCE1MmOQ" frameborder="0" allowfullscreen></iframe>
