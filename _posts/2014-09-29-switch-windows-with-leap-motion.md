---
layout:     post
title:      Switching windows with Leap&nbsp;Motion
date:       2014-09-29 06:43:00
keywords:   Leap Motion, switch windows, python, ubuntu  
---

After i abandoned [my project](https://github.com/nvbn/todomata/) on [Clojure Cup](https://clojurecup.com/)
i received little free time on this weekend. And i decided to play with
Leap Motion and create little app for switching windows using it.

Result &mdash; [leaptab](https://github.com/nvbn/leaptab).
By default app uses `win + w` for switching windows, but with `--use-alt-tab` it can use `alt + tab`.
 
For opening window switcher (`win + w` or `alt + tab`) and switching to window
you need to use circle gesture. For selecting window &ndash; swipe gesture.

Video with usage of leaptab:

<iframe width="766" height="430" src="//www.youtube.com/embed/7A6UtYtaP04" frameborder="0" allowfullscreen></iframe>

Leaptab tested with ubuntu, but should work on all major platforms, but probably only with `--use-alt-tab` argument. 
