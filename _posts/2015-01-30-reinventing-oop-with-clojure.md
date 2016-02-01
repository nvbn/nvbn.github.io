---
layout:     post
title:      Reinventing OOP with Clojure
date:       2015-01-30 01:00:00
keywords:   clojure, oop
---

From books all we know that main principles of OOP is polymorphism and encapsulation,
but other meaning is that the significant aspect of OOP is a message passing.
And in Clojure we have a cool library for dealing with messages &ndash;
[core.async](https://github.com/clojure/core.async). So we can build simple "object"
with it, and we can use [core.match](https://github.com/clojure/core.match) for "parsing" messages
in this "object".
Yep, there will be something like Erlang actors:

~~~clojure
(require '[clojure.core.async :refer [go go-loop chan <! >! >!! <!!]])
(require '[clojure.core.match :refer [match]])

(def dog
  (let [messages (chan)]
    (go-loop []
      (match (<! messages)
        [:bark!] (println "Bark! Bark!")
        [:say! x] (println "Dog said:" x))
      (recur))
    messages))
~~~

Here I've just created channel and in the `go-loop` matched received messages from them with
registered messages patterns.

Format of messages is `[:name & args]`.

We can easily test `dog` object by putting message in the channel:

~~~clojure
user=> (>!! dog [:bark!])
# Bark! Bark!

user=> (>!! dog [:say! "Hello world!"])

# Dog said: Hello world!
~~~

Looks awesome, but maybe we should add a state?  It's pretty simple:

~~~clojure
(def stateful-dog
  (let [calls (chan)]
    (go-loop [state {:barked 0}]
      (recur (match (<! calls)
               [:bark!] (do (println "Bark! Bark!")
                            (update-in state [:barked]
                                       inc))
               [:how-many-barks?] (do (println (:barked state))
                                      state))))
    calls))
~~~
I've just put default state in the bindings for `go-loop` and
`recur` it with new state after processing messages.
And we can test it:

~~~clojure
user=> (>!! stateful-dog [:bark!])
# Bark! Bark!

user=> (>!! stateful-dog [:how-many-barks?])
# 1

user=> (>!! stateful-dog [:bark!])
# Bark! Bark!

user=> (>!! stateful-dog [:bark!])
# Bark! Bark!

user=> (>!! stateful-dog [:how-many-barks?])
# 3
~~~

Great, but what if we want to receive result of the method? It's simple too:

~~~clojure
(def answering-dog
  (let [calls (chan)]
    (go-loop [state {:barked 0}]
      (recur (match (<! calls)
               [:bark! _] (do (println "Bark! Bark!")
                              (update-in state [:barked]
                                         inc))
               [:how-many-barks? result] (do (>! result (:barked state))
                                             state))))
    calls))
~~~

I've just set a channel as a last argument of the message and put result in it.
It's not that simple to use like previous examples, but it's ok:

~~~clojure
user=> (>!! answering-dog [:bark!  (chan)])
# Bark! Bark!

user=> (>!! answering-dog [:bark!  (chan)])
# Bark! Bark!

user=> (let [result (chan)]
  #_=>   (>!! answering-dog [:how-many-barks? result])
  #_=>   (<!! result))
2
~~~

Last call looks too complex, let's add a few helpers to make it easier:

~~~clojure
(defn call
  [obj & msg]
  (go (let [result (chan)]
        (>! obj (conj (vec msg) result))
        (<! result))))

(defn call!!
  [obj & msg]
  (<!! (apply call obj msg)))
~~~

`call!!` should be used only outside of `go-block`, `call` &mdash; in combination with `<!` and `<!!`. Let's look to them in action:

~~~clojure
user=> (call!! answering-dog :how-many-barks?)
2

user=> (<!! (call answering-dog :how-many-barks?))
2

user=> (call!! answering-dog :set-barks!)
# Exception in thread "async-dispatch-33" java.lang.IllegalArgumentException: No matching clause: [:set-barks!...

user=> (call!! answering-dog :how-many-barks?)
# ...
~~~

So now we have a problem, when error happens in a object &ndash; object dies and no longer
sends responses to messages. So we should add `try/except` to all methods, better to use macros for
automating that. But before we should define format of response:

* `[:ok val]` &ndash; all ok;
* `[:error error-reason]` &ndash; error happened;
* `[:none]` &ndash; we can't put just `nil` in a channel, so we'll use this.

Yep, you can notice that this looks like Maybe/Option monad.

So let's write macroses:

~~~clojure
(defn ok! [ch val] (go (>! ch [:ok val])))

(defn error! [ch reason] (go (>! ch [:error reason])))

(defn none! [ch] (go (>! ch [:none])))

(defmacro object
  [default-state & body]
  (let [flat-body (mapcat macroexpand body)]
    `(let [calls# (chan)]
       (go-loop ~default-state
         (recur (match (<! calls#)
                  ~@flat-body
                  [& msg#] (do (error! (last msg#) [:method-not-found (first msg#)])
                               ~@(take-nth 2 default-state)))))
       calls#)))

(defmacro method
  [pattern & body]
  [pattern `(try (do ~@body)
                 (catch Exception e#
                   (error! ~(last pattern) e#)))])
~~~

Macro `object` can be used for creating objects and macro `method` &mdash; for defining methods inside the object.
Here you could notice that `[& msg#]` works exactly like `method_missing` in Ruby.

So now we can create objects using this macroses:

~~~clojure
(defn make-cat
  [name]
  (object [state {:age 10
                  :name name}]
    (method [:get-name result]
      (ok! result (:name state))
      state)
    (method [:set-name! new-name result]
      (none! result)
      (assoc state :name new-name))
    (method [:make-older! result]
      (error! result :not-implemented)
      state)))

(def cat (make-cat "Simon"))
~~~

We created object `cat` with methods `get-name`, `set-name!` and `make-older!`, `make-cat` is a
improvised constructor. This object can be used like all previous objects, but in combination
with `core.match` it'll be more useful:

~~~clojure
user=> (match (call!! cat :get-name)
  #_=>   [:ok val] (println val))
# Simon

user=> (match (call!! cat :set-name! "UltraSimon")
  #_=>   [:none] (println "Name changed"))
# Name changed

user=> (match (call!! cat :get-name)
  #_=>   [:ok val] (println val))
# UltraSimon

user=> (match (call!! cat :make-older!)
  #_=>   [:ok age] (println "Now - " age)
  #_=>   [:error reason] (println "Failed with " reason))
# Failed with  :not-implemented

user=> (match (call!! cat :i-don't-know-what)
  #_=>   [:error _] (println "Failed"))
# Failed
~~~

Looks perfect! But that's not all, later I'll implement a inheritance on top of this mess.
