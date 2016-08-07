---
layout:     post
title:      Mocking clojurescript code written with core.async
date:       2014-11-05 23:26:00
keywords:   clojure, clojurescript, test, mock
---

When I write tests for the code in clojurescript and core.async I feel little pain &mdash;
`with-redefs` doesn't work correctly with go-blocks. For example I have a function:

~~~clojure
(defn get-subtitles
  [sources limit]
  (go (-> (http/get (get-url sources limit))
          <!
          :body
          format-dates)))
~~~

And the test for it:

~~~clojure
(deftest ^:async test-get-subtitles
  (with-redefs [http/get (constantly fixture)]
    (go (is (= (<! (get-subtitles const/all 100)) expected))
        (done))))
~~~

It didn't work, it actually tries to make http request. Ok, I can try to put `with-redefs`
inside go-block:

~~~clojure
(deftest ^:async test-get-subtitles
  (go (with-redefs [http/get (constantly fixture)]
        (is (= (<! (get-subtitles const/all 100)) expected)))
      (with-redefs [http/get (constantly blank-result)]
        (is (= (<! (get-subtitles const/addicted 100)) [])))
      (done)))
~~~

The first assertion works, but in the second assertion I have previously redefined `http/get`
and it's incorrect and the assertion fails &mdash; `with-redefs` permanently changes var
when applied in the go-block.

So I've developed a little macro which works like `with-redefs` and can be used inside of go-block
and with code without core.async:

~~~clojure
(defmacro with-reset
  [bindings & body]
  (let [names (take-nth 2 bindings)
        vals (take-nth 2 (drop 1 bindings))
        current-vals (map #(list 'identity %) names)
        tempnames (map (comp gensym name) names)
        binds (map vector names vals)
        resets (reverse (map vector names tempnames))
        bind-value (fn [[k v]] (list 'set! k v))]
    `(let [~@(interleave tempnames current-vals)]
       (try
         ~@(map bind-value binds)
         ~@body
         (finally
           ~@(map bind-value resets))))))
~~~

And usage:

~~~clojure
(deftest ^:async test-get-subtitles
  (go (with-reset [http/get (constantly fixture)]
        (is (= (<! (get-subtitles const/all 100)) expected)))
      (with-reset [http/get (constantly blank-result)]
        (is (= (<! (get-subtitles const/addicted 100)) [])))
      (done)))
~~~

I put this macro in [clj-di](https://github.com/nvbn/clj-di) for avoiding copying it between projects.

[Tests for this macro on github.](https://github.com/nvbn/clj-di/blob/2487359658a603c41dde621227620014fe06c6dd/test/cljx/clj_di/core_test.cljx#L88)


**UPD: example updated.**