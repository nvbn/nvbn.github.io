---
layout:     post
title:      "Rerenderer rendering performance"
date:       2016-08-03 06:30:00
keywords:   clojure, clojurescript
---

[Rerenderer](https://github.com/rerenderer/rerenderer) is a React-like
library for cross platform drawing on canvas. And we experimenting a lot
with ways to improve performance of rendering. Not so while ago
I wrote about [intermediate language and interpreter](/2016/04/13/rerenderer-life/),
this approach was interesting, but not so much efficient. Performing
optimizations on that language wasn't enough fast and interpreter on Android was
based on reflection and was a bit slow because of that. 

So now we decided to sacrifice flexibility and move component implementation
to host platforms (we use Kotlin for Android and ClojureScript for browsers).
And use simpler approach with canvases tree (one canvas for each component),
where we rerender only changed canvases  and ancestors. So for example we have a simple app:

~~~clojure
(ns rerenderer.example.core
  (:require [rerenderer.core :refer [init!]]
            [rerenderer.primitives :refer [rectangle text]]
            [rerenderer.debug :refer [swap-state!]]))

(defn labeled
  [{:keys [label width] :as options} & children]
  (rectangle options
    children
    (text {:x (- width 50) :y 0
           :width 40 :height 40
           :font-size 36
           :color "#3E454C"
           :value label})))

(defn root
  [{:keys [background-color first-color second-color third-color]}]
  (labeled {:x 0 :y 0
            :width 800 :height 400
            :color background-color
            :label "A"}
    (labeled {:x 30 :y 30
              :width 200 :height 200
              :color first-color
              :label "B"})
    (labeled {:x 100 :y 100
              :width 500 :height 250
              :color second-color
              :label "C"}
      (labeled {:x 400 :y 150
                :width 100 :height 100
                :color third-color
                :label "D"}))))

(def initial-state
  {:background-color "#FFF6E5"
   :first-color "#7ECEFD"
   :second-color "#FF7F66"
   :third-color "#2185C5"})

(defonce app (init! :root-view #'root
                    :state initial-state
                    :canvas (.getElementById js/document "canvas")
                    :width 800
                    :height 600))
~~~

<iframe src='/assets/rerenderer_3/index.html#0' width="100%" height="400" frameBorder="0" scrolling="no"></iframe>

Whole scene can be represented as a tree:

<div class="mermaid">
graph TB
    A[A]-->B[B]
    A-->C[C]
    C-->D[D]
</div>

So when we change `D`:

~~~clojure
(swap-state! app assoc :third-color :red)
~~~

<iframe src='/assets/rerenderer_3/index.html#1' width="100%" height="400" frameBorder="0" scrolling="no"></iframe>

We rerender `D`, `C` and `A`, but don't touch `B`:

<div class="mermaid">
graph TB
    A[A]-->B[B]
    A-->C[C]
    C-->D[D]
    style D fill:red;
    style C stroke:red;
    style A stroke:red;
</div>

But when we change `C`:

~~~clojure
(swap-state! app assoc :second-color :white)
~~~

<iframe src='/assets/rerenderer_3/index.html#2' width="100%" height="400" frameBorder="0" scrolling="no"></iframe>

We rerender only `C`, `A` and don't touch `B` and `D`. Because changes doesn't affect
it canvases:

<div class="mermaid">
graph TB
    A[A]-->B[B]
    A-->C[C]
    C-->D[D]
    style C fill:red;
    style A stroke:red;
</div>

You can easily notice performance boost in browser on more complex example &ndash; 
[Conway’s Game of Life](https://github.com/rerenderer/example-game-of-life/):

<div style='overflow: hidden'><div class='slow-iframe' src='https://rerenderer.github.io/example-game-of-life/' width="800" height="400" frameBorder="0" scrolling="no" style='margin-top: -130px; margin-left: -50px;'></div></div>

And on Android:

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/meTydDjfX6M?enablejsapi=1&showinfo=0&controls=0" frameborder="0" allowfullscreen></iframe>

It's faster then before, but you can notice that it's not smooth, now we have a little problem with GC.
