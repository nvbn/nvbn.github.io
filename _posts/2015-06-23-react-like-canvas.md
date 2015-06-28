---
layout:     post
title:      "React-like tool for working with canvas"
date:       2015-06-23 17:50:00
keywords:   clojure, clojurescript
---

One of the greatest ideas in React is a shadow dom, it's simple and fast.
So I decided to implement something like shadow canvas and created
[the rerenderer](https://github.com/nvbn/rerenderer/)
&mdash; a special library that accumulates calls to shadow canvas methods,
verifies that resulted script (or method set) changed and
applies the script to a real canvas.

And the huge benefit of this way to work with a canvas &mdash; it's easily to work
not only with browser canvas, but with Android (partially implemented)
and maybe even iOS.

Little note, if examples works slow on this page it's because here's too much animations
for the single page. You can open it on a new page

So, first example &ndash; a rotating rectangle:

```clojure
(defn rotating-rectangle
  [ctx {:keys [angle]} _]
  (r/call! ctx save)
  (r/call! ctx (clearRect 0 0 100 100))
  (r/set! (.. ctx -fillStyle) "red")
  (r/call! ctx (translate 35 35))
  (let [rangle (* angle (/ js/Math.PI 180))]
    (r/call! ctx (rotate rangle))
    (r/call! ctx (fillRect -25 -25 50 50)))
  (r/call! ctx restore))

(defn rotate-rectangle
  [state]
  (go-loop []
    (<! (timeout 5))
    (swap! state update-in [:angle]
           #(-> % inc (mod 360)))
    (recur)))

(defn scene-1
  [canvas]
  (let [state (atom {:angle 0})]
    (r/init! (browser canvas) rotating-rectangle state {})
    (rotate-rectangle state)))
```

Code is very low level (in comparison with the code for the same
[rectangle with svg](/2015/05/28/svg-animation/)), but it works pretty smooth: 

<iframe src="/assets/rerenderer/index.html#scene-1" width="100%" height="100" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer/index.html#scene-1" target="_blank">(open on a new page)</a>

You can notice that `r/call!` is very similar to `..` macro, and `r/set!` works just `set!`,
special macros are required for tracking interaction with the shadow canvas.

So, back to examples, let's try to make the same rectangle moving, code was changed just a bit:

```clojure
(defn rotating-and-moving-rectangle
  [ctx {:keys [angle x]} _]
  (r/call! ctx save)
  (r/call! ctx (clearRect 0 0 700 100))
  (r/set! (.. ctx -fillStyle) "red")
  (r/call! ctx (translate (+ x 25) 35))
  (let [rangle (* angle (/ js/Math.PI 180))]
    (r/call! ctx (rotate rangle))
    (r/call! ctx (fillRect -25 -25 50 50)))
  (r/call! ctx restore))

(defn rotate-and-move-rectangle
  [state]
  (go-loop []
    (<! (timeout 5))
    (swap! state update-in [:angle]
           #(-> % inc (mod 360)))
    (swap! state update-in [:x]
           #(-> % inc (mod 600)))
    (recur)))

(defn scene-2
  [canvas]
  (let [state (atom {:angle 0
                     :x 10})]
    (r/init! (browser canvas) rotating-and-moving-rectangle state {})
    (rotate-and-move-rectangle state)))
```

And it's also works very smooth:

<iframe src="/assets/rerenderer/index.html#scene-2" width="100%" height="100" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer/index.html#scene-2" target="_blank">(open on a new page)</a>

Then try to draw sprites, it's very complicated with React and SVG, but very simple with
this solution because we can use [canvas drawImage method](https://developer.mozilla.org/ru/docs/Web/API/CanvasRenderingContext2D/drawImage):

```clojure
(defn mario
  [ctx atlas mario-state x y]
  (when mario-state
    (let [[sx sy] (get-in sprites mario-state)]
      (r/call! ctx (drawImage atlas sx sy 20 40 x y 40 80)))))

(defn all-marios
  [ctx {:keys [mario-0 mario-1 mario-2 mario-3 mario-4 mario-5]} {:keys [atlas]}]
  (r/call! ctx (clearRect 0 0 300 300))
  (mario ctx atlas mario-0 10 10)
  (mario ctx atlas mario-1 60 10)
  (mario ctx atlas mario-2 110 10)
  (mario ctx atlas mario-3 10 80)
  (mario ctx atlas mario-4 60 80)
  (mario ctx atlas mario-5 110 80))

(defn handle-mario
  [state state-key draw-state-key]
  (go-loop []
    (<! (timeout 100))
    (let [[mario-direction mario-state] (get @state state-key)
          [draw-direction draw-state] (get @state draw-state-key)
          next-draw-state (if (and (= mario-direction draw-direction)
                                   (= mario-state :run))
                            ; Changes drawing state (and sprite) when Mario running:
                            (condp = draw-state
                              :run :run-1
                              :run-1 :run-2
                              :run)
                            mario-state)]
      (swap! state assoc draw-state-key [mario-direction next-draw-state]))
    (recur)))

(defn scene-3
  [canvas]
  (go (let [state (atom {:mario-0-state [:right :stand]
                         :mario-1-state [:right :run]
                         :mario-2-state [:right :jump]
                         :mario-3-state [:left :stand]
                         :mario-4-state [:left :run]
                         :mario-5-state [:left :jump]})
            platform (browser canvas)
            options {:atlas (<! (r/image platform "mario.png"))}]
        (r/init! platform all-marios state options)
        (handle-mario state :mario-0-state :mario-0)
        (handle-mario state :mario-1-state :mario-1)
        (handle-mario state :mario-2-state :mario-2)
        (handle-mario state :mario-3-state :mario-3)
        (handle-mario state :mario-4-state :mario-4)
        (handle-mario state :mario-5-state :mario-5))))
```

Code is a bit redundant, but it shows how code for rendering and code for managing state
can be easily separated. In action:

<iframe src="/assets/rerenderer/index.html#scene-3" width="100%" height="200" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer/index.html#scene-3" target="_blank">(open on a new page)</a>

So let's try something more complicated, a scene where the Mario goes to the right,
jumps, goes to the left, jumps and repeats all actions:

```clojure
(defn mario-scenario
  [state]
  (go-loop []
    ; Stand a half
    (swap! state assoc-in [:mario-state 1] :stand)
    (<! (timeout 500))
    ; Jump
    (swap! state assoc-in [:mario-state 1] :jump)
    (dotimes [_ 20]
      (<! (timeout 5))
      (swap! state update-in [:mario-y] dec))
    (dotimes [_ 20]
      (<! (timeout 5))
      (swap! state update-in [:mario-y] inc))
    ; Stand a half
    (swap! state assoc-in [:mario-state 1] :stand)
    (<! (timeout 500))
    ; Go right
    (swap! state assoc-in [:mario-state 1] :run)
    (dotimes [_ 300]
      (<! (timeout 5))
      (swap! state update-in [:mario-x] inc))
    ; Stand a second
    (swap! state assoc-in [:mario-state 1] :stand)
    (<! (timeout 500))
    (swap! state assoc-in [:mario-state 0] :left)
    (<! (timeout 500))
    ; Jump
    (swap! state assoc-in [:mario-state 1] :jump)
    (dotimes [_ 20]
      (<! (timeout 5))
      (swap! state update-in [:mario-y] dec))
    (dotimes [_ 20]
      (<! (timeout 5))
      (swap! state update-in [:mario-y] inc))
    ;Stand a half
    (swap! state assoc-in [:mario-state 1] :stand)
    (<! (timeout 500))
    ; Go back
    (swap! state assoc-in [:mario-state 1] :run)
    (dotimes [_ 300]
      (<! (timeout 5))
      (swap! state update-in [:mario-x] dec))
    ; Stand a half
    (swap! state assoc-in [:mario-state 0] :right)
    (<! (timeout 500))
    (recur)))

(defn moving-mario
  [ctx {:keys [mario-draw-state mario-x mario-y]} {:keys [atlas]}]
  (r/call! ctx (clearRect 0 0 500 300))
  (r/set! (.. ctx -fillStyle) "green")
  (r/call! ctx (fillRect 0 75 400 20))
  (mario ctx atlas mario-draw-state mario-x mario-y))

(defn scene-4
  [canvas]
  (go (let [state (atom {:mario-state [:right :stand]
                         :mario-x 20
                         :mario-y 15})
            platform (browser canvas)
            options {:atlas (<! (r/image platform "mario.png"))}]
        (r/init! platform moving-mario state options)
        (handle-mario state :mario-state :mario-draw-state)
        (mario-scenario state))))
```

There's a bit too much code for managing the state of the Mario, but I guess it's one of the
simplest ways to write a scene like this:

<iframe src="/assets/rerenderer/index.html#scene-4" width="100%" height="200" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer/index.html#scene-4" target="_blank">(open on a new page)</a>

Also rerenderer supports events (like clicks) and can play sounds,
so as a bonus &mdash; a very simplified version of the Flappy Bird:

<iframe src="/assets/rerenderer/index.html#scene-5" width="100%" height="512" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer/index.html#scene-5" target="_blank">(open on a new page)</a>

[Flappy Bird code.](https://github.com/nvbn/rerenderer/blob/master/examples/rerenderer/examples/bird.cljs)

[Rerenderer on github.](https://github.com/nvbn/rerenderer/)

[Gist with examples.](https://gist.github.com/nvbn/cfdfeacbcaaeacc2f6d3)
