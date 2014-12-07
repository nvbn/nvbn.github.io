---
layout:     post
title:      Chrome extension in ClojureScript
date:       2014-12-07 23:33:00
keywords:   clojure, clojurescript, chrome
---

Sometimes I need to write/change bunch of code in GAE interactive console
and sometimes I need to change build scripts in jenkins tasks. That's not comfortable
to write code in simple browser textarea.

So I decided to create Chrome extension with which I can convert textarea to the
code editor (and back) in a few clicks. As an editor I selected [Ace](http://ace.c9.io/)
because it simple to use and I'd worked with it before. As a language I selected
ClojureScript.

For someone who eager: [source code of the plugin on github](https://github.com/nvbn/textarea-to-code-editor),
[in the Chrome Web Store](https://chrome.google.com/webstore/detail/textarea-to-code-editor/kcapdaijpdnhajjgdimlhoaaaiplkobj).

Developing this extension almost similar to extension in JavaScript, and nearly
like ordinary ClojureScript application. But I found a few pitfalls and differences.

**ClojureScript compilation**

We can't use `:optimizations :none`
in the Chrome extension, because of `goog.require` way of loading dependencies. And
we should to build separate compiled js files for each background/content/options/etc
"pages". So my `cljs-build` configuration:

```clojure
{:builds {:background {:source-paths ["src/textarea_to_code_editor/background/"]
                       :compiler {:output-to "resources/background/main.js"
                                  :output-dir "resources/background/"
                                  :source-map "resources/background/main.js.map"
                                  :optimizations :whitespace
                                  :pretty-print true}}
          :content {:source-paths ["src/textarea_to_code_editor/content/"]
                    :compiler {:output-to "resources/content/main.js"
                               :output-dir "resources/content/"
                               :source-map "resources/content/main.js.map"
                               :optimizations :whitespace
                               :pretty-print true}}}}
```

If you want to use `:optimizations :advanced`, you can download externs for
Chrome API from [github](https://github.com/google/closure-compiler/blob/master/contrib/externs/chrome_extensions.js).

**Chrome API**

From a first look using of Chrome API from ClojureScript is a bit uncomfortable,
but with `..` macro it looks not worse than in JavaScript. For example,
adding listener to runtime messages in js:

```js
chrome.runtime.onMessage.addListener(function(msg){
    console.log(msg);
});
```

And in ClojureScript:

```clojurescript
(.. js/chrome -runtime -onMessage (addListener #(.log js/console %)))
```

**Testing**

Because we can't use Chrome API in tests I created a little function for detecting if it available:

```clojurescript
(defn available? [] (aget js/window "chrome"))
```

And run all extension bootstrapping code inside of `(when (available?) ...)`. So
now it's simple to use `with-redefs` and
[with-reset](https://github.com/nvbn/clj-di) (for mocking code inside of async tests)
for mocking Chrome API.

For running test I used [clojurescript.test](https://github.com/cemerick/clojurescript.test), my config:

```clojurescript
{:builds {:test {:source-paths ["src/" "test/"]
                 :compiler {:output-to "target/cljs-test.js"
                            :optimizations :whitespace
                            :pretty-print false}}}
 :test-commands {"test" ["phantomjs" :runner
                         "resources/components/ace-builds/src/ace.js"
                         "resources/components/ace-builds/src/mode-clojure.js"
                         "resources/components/ace-builds/src/mode-python.js"
                         "resources/components/ace-builds/src/theme-monokai.js"
                         "resources/components/ace-builds/src/ext-modelist.js"
                         "target/cljs-test.js"]}}
```

**Benefits**

Message passing between the extension background and content parts it's a little pain,
because it's always turns into huge callback hell. But [core.async](https://github.com/clojure/core.async)
(and a bit of [core.match](https://github.com/clojure/core.match)) can save us,
for example, handling messages on content side:

```clojurescript
(go-loop []
  (match (<! msg-chan)
    [:populate-context-menu data sender-chan] (h/populate-context-menu! data
                                                                        (:used-modes @storage)
                                                                        sender-chan
                                                                        msg-chan)
    [:clear-context-menu _ _] (h/clear-context-menu!)
    [:update-used-modes mode _] (h/update-used-modes! storage mode)
    [& msg] (println "Unmatched message:" msg))
  (recur))
```

Sources of [content side](https://github.com/nvbn/textarea-to-code-editor/blob/master/src/textarea_to_code_editor/content/chrome.cljs)
and [backend side](https://github.com/nvbn/textarea-to-code-editor/blob/master/src/textarea_to_code_editor/background/chrome.cljs)
helpers for sending/receiving Chrome runtime messages using `core.async` channels.

**Links**

[Sources on github](https://github.com/nvbn/textarea-to-code-editor),
[extension in the Chrome Web Store](https://chrome.google.com/webstore/detail/textarea-to-code-editor/kcapdaijpdnhajjgdimlhoaaaiplkobj).
