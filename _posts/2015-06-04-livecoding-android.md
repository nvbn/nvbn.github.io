---
layout:     post
title:      "Livecoding for Android with ClojureScript and Bocko"
date:       2015-06-04 15:22:00
keywords:   clojure, clojurescript, android
---

Not so long ago I found a cool library that allows us to draw simple graphic
&mdash; [Bocko](https://github.com/mfikes/bocko). It works in browsers, on desktop and on iOS,
but not on Android. So I decided to [port it](https://github.com/nvbn/bocko-android).
Not by putting it in a WebView, I wanted a native app.
Not by using [Clojure on Android](http://clojure-android.info/),
it was a bit laggy when I tried it, it was an year or more ago, so I guess I should try it again.
But by running ClojureScript inside a WebView and using a proxy object for drawing
on a native canvas.

And one of the greatest advantages of this method &ndash; I can use [figwheel](https://github.com/bhauman/lein-figwheel)
just by changing url that opens in the WebView. First of all,
it gives use REPL. And code, evaluated in the REPL, executes on Android device
and changes painting on the screen:

[![scale](/assets/bocko/repl.gif)](/assets/bocko/repl.gif)

Also, figwheel automatically pushes changes in the code to the device,
so when the code changes, painting on the screen changes too:

[![scale](/assets/bocko/code.gif)](/assets/bocko/code.gif)

And it's simple to configure. First of all you need to changed method `getUrl`
from `BockoAndroid/app/src/main/java/com/nvbn/bockoandroid/BockoView.java`
to something like this, but with your ip address:

~~~java
String getUrl() {
    return "http://192.168.0.107:3449/";
}
~~~

And write your ip address in `:websocket-host` in `:figwheel` section of
`:cljsbuild` build configuration, so your `project.clj` will be like: 

~~~clojure
(defproject bocko-example "0.1.0-SNAPSHOT"
            :license {:name "Eclipse Public License"
                      :url "http://www.eclipse.org/legal/epl-v10.html"}
            :dependencies [[org.clojure/clojure "1.7.0-beta3"]
                           [org.clojure/clojurescript "0.0-3269"]
                           [bocko "0.3.0"]
                           [bocko-android "0.1.3-1"]]
            :plugins [[lein-cljsbuild "1.0.6"]
                      [lein-figwheel "0.3.3"]]
            :cljsbuild {:builds {:main {:source-paths ["src"]
                                        :figwheel {:websocket-host "192.168.0.107"}
                                        :compiler {:output-to "resources/public/compiled/main.js"
                                                   :output-dir "resources/public/compiled"
                                                   :asset-path "/compiled"
                                                   :main bocko-example.core
                                                   :source-map true
                                                   :optimizations :none
                                                   :pretty-print false}}}})
~~~

[Bocko on Android github.](https://github.com/nvbn/bocko-android)
