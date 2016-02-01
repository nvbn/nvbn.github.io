---
layout:     post
title:      "Redis RPOP-LPUSH as a core.async channel"
date:       2015-04-04 11:50:00
keywords:   redis, clojure
---

Redis has `RPOP` and `LPUSH` commands, which often used for creating
simpler messaging queue, for example, open two `redis-cli`:

~~~bash
# first cli
127.0.0.1:6379> LPUSH queue "test"
(integer) 1

# second cli
127.0.0.1:6379> RPOP queue
"test"
~~~

And semantic of this commands are a bit like `>!` (`LPUSH`) and `<!` (`RPOP`)
from [core.async](https://github.com/clojure/core.async). So why not implement special channel which will use
Redis lists?

As a library for working with
Redis I'll use [carmine](https://github.com/ptaoussanis/carmine/)
because It's most popular and alive.

Let's start with `>!`, for doing it we should implement
method `put!` of `WritePort` protocol, and call `LPUSH` command inside
of the method:

~~~clojure
(require '[clojure.core.async.impl.protocols :refer [WritePort]]
         '[taoensso.carmine :refer [wcar lpush]])
         
(defn redis-chan
  [conn id]
  (reify
    WritePort
    (put! [_ val _]
      (atom (wcar conn
              (lpush id val))))))
~~~

And try it:

~~~clojure
user=> (require '[clojure.core.async :refer [>!!]])
nil
user=> (def ch (redis-chan {} :queue))
#'user/ch
user=> (>!! ch "test-data")
1
~~~

Check result in redis-cli:

~~~bash
127.0.0.1:6379> RPOP "queue"
"test-data"
~~~

Yep, it's working and it's very simple.

So now the time for `<!`, we should implement method `take!` of `ReadPort` protocol. 
We have two variants for popping value from Redis list: use `RPOP` and poll
Redis for new values in list, or just use blocking `BRPOP`.
I chose simplest solution &ndash; `BRPOP`,
but for non-blocking semantic of `go` and `<!` we should call that command
in separate thread, I don't recommend doing stuff like this in your
production code, but this is just an experiment. So `redis-chan`
with ability to `take!` values will be:

~~~clojure
(require '[clojure.core.async.impl.protocols :refer [ReadPort WritePort take!]]
         '[clojure.core.async :refer [thread]]
         '[taoensso.carmine :refer [wcar brpop lpush]])

(defn redis-chan
  [conn id]
  (reify
    ReadPort
    (take! [_ handler]
      (take! (thread (last (wcar conn
                             (brpop id 0))))
             handler))
    WritePort
    (put! [_ val _]
      (atom (wcar conn
              (lpush id val))))))
~~~

Try it:

~~~clojure
user=> (require '[clojure.core.async :refer [>!! <!!]])
nil
user=> (def ch (redis-chan {} :queue))
#'user/ch
user=> (>!! ch "new-data")
1
user=> (<!! ch)
"new-data"
user=> (>!! ch "other-data")
1
~~~

And ensure that all works correctly from `redis-cli`:

~~~bash
127.0.0.1:6379> RPOP "queue"
"other-data
~~~

It's working! 
