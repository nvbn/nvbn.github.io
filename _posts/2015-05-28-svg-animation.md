---
layout:     post
title:      "Reactive animation with SVG, ClojureScript and Om"
date:       2015-05-28 21:09:00
keywords:   om, clojure, clojurescript, svg
---

Animation in a browser is a very complicated subject, it requires tons of timers,
hard-to-track imperative stuff like `drawRect`. But can't it be simplified to just drawing
specific items in some places at certain times? Sounds complicated too, but it’s not.
In `SVG` it's just a changing of attributes like `x`, `y`, `width` and etc,
or inserting DOM nodes with desired attributes. Sounds like React will be useful here,
I'll use not just React, but Om with [om-tools](https://github.com/Prismatic/om-tools)
(for better syntax).

For example, what if we want to draw a rotating red rectangle? Looks like we just
need to change `transform` attribute of the rectangle every `n` milliseconds:

~~~clojure
(defcomponent rotated-rect
  [{:keys [x y width height]} owner]
  (init-state [_] {:angle 0})
  (will-mount [_]
    (go-loop []
      ; Increases angle every 10 milliseconds:
      (om/update-state! owner :angle #(-> % inc (mod 360)))
      (<! (timeout 10))
      (recur)))
  (render-state [_ {:keys [angle]}]
    (let [center-x (+ x (/ width 2))
          center-y (+ y (/ height 2))]
      (dom/rect {:width width
                 :height height
                 :fill "red"
                 ; Rotates rectangle for `angle`:
                 :transform (str "rotate(" angle ", " center-x ", " center-y ")")
                 :x x
                 :y y}))))

(defcomponent scene-1
  [_ _]
  (render [_]
    (dom/svg {:width "100%" :height "100%"}
             (om/build rotated-rect {:x 50
                                     :y 50
                                     :width 100
                                     :height 100}))))
~~~

Isn't it simple? And it works:

<iframe src="/assets/svg-animation/scene.html#1" width="100%" height="200" frameBorder="0" scrolling="no"></iframe>

What if we want to move the rectangle across the scene? We can do it without changing `rotated-rect`:

~~~clojure
(defcomponent scene-2
  [_ owner]
  (init-state [_] {:x 0})
  (will-mount [_]
    (go-loop []
      ; Increases x every 10 milliseconds:
      (om/update-state! owner :x #(-> % inc (mod 600)))
      (<! (timeout 10))
      (recur)))
  (render-state [_ {:keys [x]}]
    (dom/svg {:width "100%" :height "100%"}
             (om/build rotated-rect {:x x
                                     :y 50
                                     :width 100
                                     :height 100}))))
~~~

And the rectangle continued to rotate:

<iframe src="/assets/svg-animation/scene.html#2" width="100%" height="200" frameBorder="0" scrolling="no"></iframe>

Sprites are very useful for animation, and in SVG it can be used with combination of `pattern`
and `image` tags, but both of them doesn't supported by Om (because not supported by React).
But we can use ugly `dangerouslySetInnerHTML` attribute:

~~~clojure
(defcomponent sprite
  [{:keys [x y img-width img-height scale sprite-x sprite-y sprite-w sprite-h href]} _]
  (render-state [_ _]
    (let [id (gensym)]
      (dom/g (dom/defs {:dangerouslySetInnerHTML {:__html (str "
            <pattern id='" id "'
                     patternUnits='userSpaceOnUse'
                     x='" x "'
                     y='" y "'
                     width='" sprite-w "'
                     height='" sprite-h "'>
              <image x='" (- 0 sprite-x) "'
                     y='" (- 0 sprite-y) "'
                     xlink:href='" href "'
                     width='" img-width "'
                     height='" img-height "'
                     transform='scale(" scale ")' />
            </pattern>")}})
             (dom/rect {:x x :y y :width sprite-w :height sprite-h
                        :fill (str "url(#" id ")")})))))

(defcomponent scene-3
  [_ _]
  (render [_]
    (dom/svg {:width "100%" :height "100%"}
             (om/build sprite {:img-width 406
                               :img-height 1507
                               :scale 2
                               :sprite-w 40
                               :sprite-h 80
                               :href "mario.png"
                               :sprite-x 214
                               :sprite-y 240}))))
~~~

And render Mario from the sprite:

<iframe src="/assets/svg-animation/scene.html#3" width="100%" height="100" frameBorder="0" scrolling="no"></iframe>

So we have the sprite with a few poses of Mario, why not create a component for him?
Assume that he can stand, run and jump to left and right, and running is an animation
of changing three images. So Mario component should render himself depending on state
and direction:

~~~clojure
(defn mario-sprite
  [& opts]
  (om/build sprite (assoc (apply hash-map opts)
                     :img-width 406
                     :img-height 1507
                     :scale 2
                     :sprite-w 40
                     :sprite-h 80
                     :href "mario.png")))

(def sprites
  {:right {:run [328 320]
           :run-1 [354 320]
           :run-2 [378 320]
           :jump [335 240]
           :stand [214 240]}
   :left {:run [60 320]
          :run-1 [34 320]
          :run-2 [8 320]
          :jump [54 240]
          :stand [174 240]}})

(defcomponent mario
  [{:keys [x y]} owner]
  (init-state [_] {:state :stand
                   :direction :left})
  (will-mount [_]
    (go-loop []
      (let [state (om/get-props owner :state)
            direction (om/get-props owner :direction)
            drawing-state (om/get-state owner :state)
            drawing-direction (om/get-state owner :direction)
            next-state (if (and (= direction drawing-direction) (= state :run))
                         ; Changes drawing state (and sprite) when Mario running:
                         (condp = drawing-state
                           :run :run-1
                           :run-1 :run-2
                           :run)
                         state)]
        (om/set-state! owner :state next-state)
        (om/set-state! owner :direction direction))
      (<! (timeout 100))
      (recur)))
  (render-state [_ {:keys [state direction]}]
    (let [[sx sy] (get-in sprites [direction state])]
      (mario-sprite :x x
                    :y y
                    :sprite-x sx
                    :sprite-y sy))))

(defcomponent scene-4
  [_ _]
  (render [_]
    (dom/svg {:width "100%" :height "100%"}
             (om/build mario {:x 10 :y 10 :state :stand :direction :right})
             (om/build mario {:x 60 :y 10 :state :run :direction :right})
             (om/build mario {:x 110 :y 10 :state :jump :direction :right})
             (om/build mario {:x 10 :y 100 :state :stand :direction :left})
             (om/build mario {:x 60 :y 100 :state :run :direction :left})
             (om/build mario {:x 110 :y 100 :state :jump :direction :left}))))
~~~

It works and now we can see Mario rendered with all available states and directions:

<iframe src="/assets/svg-animation/scene.html#4" width="100%" height="200" frameBorder="0" scrolling="no"></iframe>

So let's write a simple animation with Mario: he jumps, goes to the right end, jumps,
goes to the left end and repeats. With `core.async` it's very simple to write "scenario" for this:

~~~clojure
(defcomponent scene-5
  [_ owner]
  (init-state [_] {:mario-state :stand
                   :mario-x 20
                   :mario-y 10
                   :mario-direction :right})
  (will-mount [_]
    (go-loop []
      ; Stand a half
      (om/set-state! owner :mario-state :stand)
      (<! (timeout 500))
      ; Jump
      (om/set-state! owner :mario-state :jump)
      (dotimes [_ 20]
        (<! (timeout 5))
        (om/update-state! owner :mario-y dec))
      (dotimes [_ 20]
        (<! (timeout 5))
        (om/update-state! owner :mario-y inc))
      ; Stand a half
      (om/set-state! owner :mario-state :stand)
      (<! (timeout 500))
      ; Go right
      (om/set-state! owner :mario-state :run)
      (dotimes [_ 300]
        (<! (timeout 5))
        (om/update-state! owner :mario-x inc))
      ; Stand a second
      (om/set-state! owner :mario-state :stand)
      (<! (timeout 500))
      (om/set-state! owner :mario-direction :left)
      (<! (timeout 500))
      ; Jump
      (om/set-state! owner :mario-state :jump)
      (dotimes [_ 20]
        (<! (timeout 5))
        (om/update-state! owner :mario-y dec))
      (dotimes [_ 20]
        (<! (timeout 5))
        (om/update-state! owner :mario-y inc))
      ;Stand a half
      (om/set-state! owner :mario-state :stand)
      (<! (timeout 500))
      ; Go back
      (om/set-state! owner :mario-state :run)
      (dotimes [_ 300]
        (<! (timeout 5))
        (om/update-state! owner :mario-x dec))
      ; Stand a half
      (om/set-state! owner :mario-direction :right)
      (<! (timeout 500))
      (recur)))
  (render-state [_ {:keys [mario-state mario-direction mario-x mario-y]}]
    (dom/svg {:width "100%" :height "100%"}
             (om/build mario {:x mario-x
                              :y mario-y
                              :state mario-state
                              :direction mario-direction})
             (dom/rect {:fill "green"
                        :x 0
                        :y 70
                        :width 400
                        :height 20}))))
~~~

It's simple and it works:

<iframe src="/assets/svg-animation/scene.html#5" width="100%" height="100" frameBorder="0" scrolling="no"></iframe>


Looks cool, but it isn't. Animation is laggy and isn't smooth, and it glitches. So I guess it isn't
an appropriate solution for an SVG animation. And only working solution is,
I guess &ndash; `<animate>` and `<animateTransform>`, further I'll try to make them work with Om,
`dangerouslySetInnerHTML` isn't enough for them.

[Gist with the source code.](https://gist.github.com/nvbn/581ff6a88a805bd2a7ab)
