---
layout:     post
title:      "Conway's Game of Life for Web and Android with ClojureScript"
date:       2016-04-13 14:45:00 +03:00
keywords:   clojure, clojurescript
---

Recently I've been working on [rerenderer](https://github.com/rerenderer/rerenderer)
&ndash; cross-platform react-like library for drawing on canvas. So
I though it would be nice to implement Conway's Game of Life with it.

All rerenderer applications have two essential parts: controller,
that manipulates state and handle events, and view, that renders it. It's actually MVC,
but model (state) here is just an `atom`.

Let's start with view:

~~~clojure
(ns example.game-of-life.view
  (:require [rerenderer.primitives :refer [rectangle]]))

(def cell-size 40)

(defn cell
  [[x y]]
  (let [cell-x (* cell-size x)
        cell-y (* cell-size y)]
    (rectangle {:x cell-x
                :y cell-y
                :width cell-size
                :height cell-size
                :color "green"})))

(defn root-view
  [{:keys [cells]}]
  (rectangle {:x 0
              :y 0
              :width 1920
              :height 1080
              :color "white"}
    (for [cell-data cells]
      (cell cell-data))))
~~~

Here `cell` is the game cell, it will be rendered as a green rectangle. And `root-view` is the
game scene that will contain all cells.

One nice thing about rerenderer, that it just renders state, so you can change `:cells` in editor below and see how
`root-view` will rerender it:

<iframe src='/assets/gameoflife/index.html' width="100%" height="300" frameBorder="0" scrolling="no"></iframe>

Now it's time for controller. Game logic already was implemented million times, it's not so interesting,
so I've just took it from [sebastianbenz/clojure-game-of-life](https://github.com/sebastianbenz/clojure-game-of-life/)
and we'll use `tick` function from there:

~~~clojure
(ns example.game-of-life.controller
  (:require-macros [cljs.core.async.macros :refer [go-loop]])
  (:require [cljs.core.async :refer [<! timeout]]))

(defn main-controller
  [_ state-atom _]
  (go-loop []
    (<! (timeout 100))
    (swap! state-atom update :cells tick)
    (recur)))
~~~

It's very simple, every 100ms we'll get new game state with `tick` and update rendering state.

And now the final part, glue that connect controller with view and state:

~~~clojure
(ns example.game-of-life.core
  (:require [rerenderer.core :refer [init!]]
            [example.game-of-life.view :refer [root-view]]
            [example.game-of-life.controller :refer [main-controller]]))

(def inital-state {:cells [[1 5] [2 5] [1 6] [2 6]
                           [11 5] [11 6] [11 7] [12 4] [12 8] [13 3] [13 9] [14 3] [14 9]
                           [15 6] [16 4] [16 8] [17 5] [17 6] [17 7] [18 6]
                           [21 3] [21 4] [21 5] [22 3] [22 4] [22 5] [23 2] [23 6] [25 1] [25 2] [25 6] [25 7]
                           [35 3] [35 4] [36 3] [36 4]]})

(init! :root-view root-view
       :event-handler main-controller
       :state inital-state)
~~~

And that's all, in action:

<div style='overflow: hidden'><div class='slow-iframe' src='https://rerenderer.github.io/example-game-of-life/' width="800" height="400" frameBorder="0" scrolling="no" style='margin-top: -130px; margin-left: -50px;'></div></div>

And it works on [Android (apk)](https://rerenderer.github.io/example-game-of-life/game_of_life.apk), not without problems, it has
some performance issues. And there's strange behaviour, it's like ten times slower when screen recorder is on.
But it works without changes in code and renders on Android native Canvas:

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/oXI5vwFzt8s?enablejsapi=1&showinfo=0&controls=0" frameborder="0" allowfullscreen></iframe>

[Source code on github.](https://github.com/rerenderer/example-game-of-life/)
