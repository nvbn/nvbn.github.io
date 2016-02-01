---
layout:     post
title:      "From Shadow Canvas to Shadow Script"
date:       2015-08-11 15:47:00
keywords:   clojure, clojurescript
---

Not so long ago I'd introduced a concept of [Shadow Canvas](/2015/06/23/react-like-canvas/)
that was used in [rerenderer](https://github.com/nvbn/rerenderer). Basically 
it was just a mechanism, that remembers all actions performed to a canvas,
and applies it on browser or android canvas, if the sequence of actions changed. Like
Shadow DOM from React.

But it was very limited, supported only calls and attributes changes, so it wasn't possible
to render something on offscreen canvas or load some bitmap and draw. So I rethought
and came up with a concept of Shadow Script, it's a simple DSL, that has only a few constructions:

~~~clojure
; Create instance of `cls` with `args` (list of values or vars) and put result in
; variables hash-map with key `result-var`:
[:new result-var cls args]
; Change `var` attribute `attr` to `value` (can be variable):
[:set var attr value]
; Put value of `var` attribute `attr` in variables hash-map with key `result-var`:
[:get result-var var attr]
; Call method `method` of `var` with `args` (list of values or vars) and put result in
; variables hash-map with key `result-var`:
[:call result-var var method args]
~~~

It will be painful to write this constructions manually, so I implemented `new`,
`..` and `set!` macros. So code looks like an ordinary Clojure code. For example &mdash;
a code for drawing a red rectangle:

~~~clojure
(let [canvas (new Canvas)
      context (.. canvas (getContext "2d"))]
  (set! (.. canvas -width) 200)    
  (set! (.. canvas -height) 200)
  (set! (.. context -fillStyle) "red")
  (.. context (fillRect 0 0 100 100))) 
~~~

Will be translated to:

~~~clojure
[[:new "G_01" :Canvas []]
 [:call "G_02" "G_01" "getContext" ["2d"]]
 [:set "G_01" "width" 200]
 [:set "G_01" "height" 200]
 [:set "G_02" "fillStyle" "red"]
 [:call "G_03" "G_02" "fillRect" [0 0 100 100]]]
~~~

<iframe src="/assets/rerenderer_2/index.html#1" width="100%" height="130" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer_2/index.html#1" target="_blank">(open on a new page)</a>

A huge benefit of Shadow Script, is that an interpreter can be build very easily,
and this is significant, because we need to implement interpreter
three or more times: for browsers in ClojureScript, for Android in Java (or Kotlin?) and
for iOS in Objective-C (or Swift). And interpreter in ClojureScript is basically just: 

~~~clojure
(defn interprete-line
  "Interpretes a single `line` of script and returns changed `vars`."
  [vars line]
  (match line
    [:new result-var cls args] (create-instance vars result-var cls args)
    [:set var attr value] (set-attr vars var attr value)
    [:get result-var var attr] (get-attr vars result-var var attr)
    [:call result-var var method args] (call-method vars result-var var
                                                    method args)))

(defn interprete
  "Interpretes `script` and returns hash-map with vars."
  [script]
  (reduce interprete-line {} script))
~~~

[(full code)](https://github.com/nvbn/rerenderer/blob/e0d90c4b733be1445302d146fed103d2c975c371/src/rerenderer/browser.cljs#L40)

Another cool stuff is that we can construct a dependencies tree and recreate only changed
canvases/bitmaps/etc. So, for example we need to draw a red rectangle on another rectangle,
which color stored in a state:

~~~clojure
(defn draw-box
  [color w h]
  (let [canvas (new Canvas)
        context (.. canvas (getContext "2d"))]
    (set! (.. canvas -width) w)
    (set! (.. canvas -height) h)
    (set! (.. context -fillStyle) color)
    (.. context (fillRect 0 0 w h))
    canvas))

(let [red-box (draw-box "red" 50 50)
      another-box (draw-box (:color state) 800 600)
      another-box-ctx (.. another-box (getContext "2d"))]
  (.. another-box-ctx (drawImage red-box 50 50)))
~~~

With state `{:color "yellow"}` script we'll be:

~~~clojure
[[:new "G_01" :Canvas []]
 [:call "G_02" "G_01" "getContext" ["2d"]]
 [:set "G_01" "width" 50]
 [:set "G_01" "height" 50]
 [:set "G_02" "fillStyle" "red"]
 [:call "G_03" "G_02" "fillRect" [0 0 50 50]]
 [:new "G_04" :Canvas []]
 [:call "G_05" "G_04" "getContext" ["2d"]]
 [:set "G_04" "width" 800]
 [:set "G_04" "height" 600]
 [:set "G_05" "fillStyle" "yellow"]
 [:call "G_06" "G_05" "fillRect" [0 0 800 600]]
 [:call "G_07" "G_04" "getContext" ["2d"]]
 [:call "G_08" "G_07" "drawImage" ["G_01" 50 50]]]
~~~

<iframe src="/assets/rerenderer_2/index.html#2" width="100%" height="130" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer_2/index.html#2" target="_blank">(open on a new page)</a>

And with state `{:color "green"}`:

~~~clojure
[[:new "G_01" :Canvas []]
 [:call "G_02" "G_01" "getContext" ["2d"]]
 [:set "G_01" "width" 50]
 [:set "G_01" "height" 50]
 [:set "G_02" "fillStyle" "red"]
 [:call "G_03" "G_02" "fillRect" [0 0 50 50]]
 [:new "G_04" :Canvas []]
 [:call "G_05" "G_04" "getContext" ["2d"]]
 [:set "G_04" "width" 800]
 [:set "G_04" "height" 600]
 [:set "G_05" "fillStyle" "green"]
 [:call "G_06" "G_05" "fillRect" [0 0 800 600]]
 [:call "G_07" "G_04" "getContext" ["2d"]]
 [:call "G_08" "G_07" "drawImage" ["G_01" 50 50]]]
~~~

<iframe src="/assets/rerenderer_2/index.html#3" width="100%" height="130" frameBorder="0" scrolling="no"></iframe>
<a href="/assets/rerenderer_2/index.html#3" target="_blank">(open on a new page)</a>

You can see that canvas `G_01` wasn't changed, and all lines before
`[:new "G_04" :Canvas []]` can be skipped. This sounds cool, but it's a bit
complex, so it's not yet implemented.

[Gist with examples.](https://gist.github.com/nvbn/cc21d1360c8874e4fd41)
