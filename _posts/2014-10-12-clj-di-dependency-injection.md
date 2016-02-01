---
layout:     post
title:      "clj-di: dependency injection for clojure and clojurescript"
date:       2014-10-12 20:55:00
keywords:   clojure, clojurescript, clj-di, dependency injection  
---

I was surprised when i found that no one wrote library for dependency
injection which works on clojure and clojurescript. I found [component](https://github.com/stuartsierra/component),
but it's too complex and not working with clojurescript.

So i developed little library &ndash; [clj-di](https://github.com/nvbn/clj-di/).
I wrote it using cljx, so library can work with clojure and clojurescript.
Library uses atom with hash map for storing dependencies.
Dependency can be registered and received using keyword.

Library has two ways for registering dependencies. Permanently with `register!`
(i use it in `lein-ring` `:init` for creating db connections):

~~~clojure
(register! :db (Database.)
           :logger (get-logger))
~~~

And for code block with `with-registered` (i use it in tests for registering mocks):

~~~clojure
(with-registered [:db (Database.)
                  :logger (get-logger)]
  ...)
~~~

And two ways for receiving dependency. With `get-dep` function (useful for receiving single dependency):

~~~clojure
(get-dep :db)
~~~

And with `let-deps` macro (useful for receiving more than one dependency):

~~~clojure
(let-deps [conn :db
           log :logger]
  ..)
~~~

You can see more on [github](https://github.com/nvbn/clj-di/) and in [documentation](http://nvbn.github.io/clj-di/).
