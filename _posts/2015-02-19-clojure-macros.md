---
layout:     post
title:      "Colin Jones: Mastering Clojure Macros"
date:       2015-02-19 18:26:00
keywords:   book
---

![book cover white](/assets/clojure_macros_book.jpg) About a month ago I was recommended to
read [Mastering Clojure Macros: Write Cleaner, Faster, Smarter Code by Colin Jones](https://pragprog.com/book/cjclojure/mastering-clojure-macros).
It's a short book, and a few days ago I've finished it. And it's a good book, it contains
good examples of macros, explains how some macros from core and popular libraries
([compojure](https://github.com/weavejester/compojure), [hiccup](https://github.com/weavejester/hiccup) and etc)
work, explains some pitfalls and best practices.

Also from this book I've learned about useful `name-with-attributes` macro from
[tools.macro](https://github.com/clojure/tools.macro), before that I'd always reinvented the wheel
when I needed to create `defsomething` macro with docstrings and metadata support.
