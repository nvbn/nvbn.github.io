---
layout:     post
title:      "Use SVG &lt;image&gt; tag with Om"
date:       2015-05-24 23:38:00
keywords:   om, clojure, clojurescript, svg
---

Few days ago I had to use `<image>` for rendering image inside an SVG "scene"
inside an Om component, but I ran into a problem, Om doesn't provide `om.dom/image`.
Then I found that neither do React, and [there's already outdated pull request for that](https://github.com/facebook/react/pull/2263).

But React has an ugly solution for using raw html &ndash;
[dangerouslySetInnerHTML](https://facebook.github.io/react/tips/dangerously-set-inner-html.html).
So it's easy to create Om component for an image:

~~~clojure
(defn image
  [{:keys [href x y width height]} _]
  (reify
    om/IRender
    (render [_]
      (let [html (str "<image x='" x "' y='" y "'"
                      "width='" width "' height='" height "'"
                      "xlink:href='" href "'/>")]
        (dom/g #js {:dangerouslySetInnerHTML #js {:__html html}})))))
~~~

It just put a raw html inside `<g>` SVG tag. Usage:

~~~clojure
(om/build image {:href "image.png"
                 :x 10
                 :y 20
                 :width 200
                 :height 300})
~~~

Solution is a bit ugly and unsafe, but it works:

<iframe src="/assets/svg-image/index.html" width="100%"
        scrolling="no" frameBorder="0"></iframe>

[Gist with the example sources from the iframe.](https://gist.github.com/nvbn/2fb29382674e18eb9b76)
