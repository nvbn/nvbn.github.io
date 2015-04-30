---
layout:     post
title:      "Brainfuck compiler in Clojure"
date:       2015-04-30 00:04:00
keywords:   clojure
---

Brainfuck is one of the simplest languages to implement,
so why not creates special compiler which translates Brainfuck code
to composition of pure (actually not, `.` isn't pure) functions?

At first let's implement simple version without loops (`[]`),
and write functions for `+-<>.`. I think it's a good place for using
a multimethod:

```clojure
(defmulti run-symbol
  (fn [symbol _] symbol))

(defmethod run-symbol \+
  [_ {:keys [pos] :as state}]
  (update-in state [:stack pos] inc))

(defmethod run-symbol \-
  [_ {:keys [pos] :as state}]
  (update-in state [:stack pos] dec))

(defmethod run-symbol \>
  [_ {:keys [stack pos] :as state}]
  (let [new-pos (inc pos)]
    (assoc state :pos new-pos
                 :stack (if (>= new-pos (count stack))
                          (conj stack 0)
                          stack))))

(defmethod run-symbol \<
  [_ {:keys [pos] :as state}]
  (let [new-pos (dec pos)]
    (if (neg? new-pos)
      (update-in state [:stack] into [0])
      (assoc state :pos new-pos))))

(defmethod run-symbol \.
  [_ {:keys [pos] :as state}]
  (-> (get-in state [:stack pos])
      char
      print)
  state)

(defmethod run-symbol \,
  [_ {:keys [pos] :as state}]
  (->> (read-line)
       first
       (assoc-in state [:stack pos])))

(defmethod run-symbol :default [_ state] state)
```

Each method gets state and returns new one, state is a map with keys
`:pos` and `:stack`. And now is simple to write simple translator
using this methods:

```clojure
(defn compile-simple
  "Creates composition of functions from Brainfuck code." 
  [code]
  (->> (map #(partial run-symbol %) code)
       reverse
       (apply comp)))

(defn run-code
  "Compiles Brainfuck code and runs it with default state."
  [code]
  ((compile-simple code) {:stack [0]
                          :pos 0}))
```

Let's test it with `Hello World!`:

```clojure
user=> (run-code "+++++++++++++++++++++++++++++++++++++++++++++
  #_=>  +++++++++++++++++++++++++++.+++++++++++++++++
  #_=>  ++++++++++++.+++++++..+++.-------------------
  #_=>  ---------------------------------------------
  #_=>  ---------------.+++++++++++++++++++++++++++++
  #_=>  ++++++++++++++++++++++++++.++++++++++++++++++
  #_=>  ++++++.+++.------.--------.------------------
  #_=>  ---------------------------------------------
  #_=>  ----.-----------------------.")
Hello World!
{:pos 0, :stack [10]}
```

It works, so now it's time to add support of loops, and I guess simplest way to
do this &ndash; extract code inside `[]` and compile it's separately,
so now symbol can be a function and when it's a function
&ndash; it's always loop (a bit hackish), so we need to rewrite `:default`:

```clojure
(defmethod run-symbol :default
  [symbol state]
  (if (fn? symbol)
    (loop [{:keys [pos stack] :as state} state]
      (if (zero? (stack pos))
        state
        (recur (symbol state))))
    state))
```

And code of extractor and updated code of the compiler:

```clojure
(defn update-last
  [coll & args]
  (apply update-in coll [(dec (count coll))] args))

(defn extract-loops
  [code]
  (loop [[current & rest] code
         loops []
         result []]
    (cond
      ; Returns result when all code processed
      (nil? current) result
      ; Start of a new loop
      (= current \[) (recur rest (conj loops []) result)
      ; End of a loop when it inside another loop
      (and (= current \]) (> (count loops) 1)) (recur rest
                                                      (butlast loops)
                                                      (update-last result conj
                                                                   (compile-simple (last loops))))
      ; End of a top level loop
      (= current \]) (recur rest
                            (butlast loops)
                            (conj result (compile-simple (last loops))))
      ; Code inside a loop
      (seq loops) (recur rest
                         (update-last loops conj current)
                         result)
      ; Code outside a loop
      :else (recur rest loops (conj result current)))))

(defn compile-code
  [code]
  (-> (extract-loops code)
      compile-simple))

(defn run-code
  [code]
  ((compile-code code) {:stack [0]
                        :pos 0}))
```

So now we can test it with `Hello World!` with loops:

```clojure
user=> (run-code "++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++
  #_=>  .>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.
  #_=>  ------.--------.>+.>.")
Hello World!
{:pos 4, :stack [0 87 100 33 10]}
```

Yep, it works!

[Gist with source code.](https://gist.github.com/nvbn/fb823348f39ce8fca4f0)
