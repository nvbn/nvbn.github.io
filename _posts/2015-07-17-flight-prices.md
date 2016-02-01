---
layout:     post
title:      "Searching for a cheap flight ticket with Clojure and Chrome"
date:       2015-07-17 03:45:00
keywords:   clojure, chrome
---

Few days ago I had to find a cheap flight ticket. And all services that I know
allows to search only for selected day, but I needed for a month. It's a pain to
select every day, search and manually choose a best deal. So I decided to automate it.

As I know all services uses tons of client-side code for searching and some times
asks to type a captcha,
so simplest solution is to write an extension from Chrome. As an enemy I selected
[Yandex Avia](https://avia.yandex.ru/), because I just used to it, but It's
not so important, approach used in the article can be used with other services.

First of all, let's create main function for searching:

~~~clojure
(defn run
  [id-from id-to date-from date-to]
  (->> (days-range date-from date-to)
       (map #(get-flights id-from id-to %))
       concat-flights
       present))
~~~

Where's `id-from` and `id-to` are airports ids, `date-from` and `date-to` are date range for
searching. Code looks very straightforward, we just creates a date range, gets flights,
concats results
and presents it. Now we need to implement each function from this pipeline.

`days-range` isn't interesting, so let's start with `get-flights`. In this function we
should open a tab with special url, get results from it and close the tab. So start with
opening a tab with `chrome.tabs.create`:
 
~~~clojure
(defn open-tab
  [url]
  (let [done (chan)]
    (.. js/chrome -tabs (create #js {:url url}
                                #(go (>! done %))))
    done))
~~~

This action is asynchronously, so we use `core.async` here.

So now let's look to most complicated part &ndash; parsing. That part works on the background's
side and on the content side (on the service's web app pages). Background side is a bit
complicated: we should send a script to content with `chrome.tabs.executeScript`
and wait for a message with result using `chrome.runtime.onMessage.addListener`,
but it can be implemented very simple:

~~~clojure
; Map of tab-id => chan
(def waiting (atom {}))

; Puts received message to the waiting channel
(.. js/chrome -runtime -onMessage (addListener
                                    #(go (let [result (js->clj %1 :keywordize-keys true)
                                               {:keys [tab]} (js->clj %2 :keywordize-keys true)
                                               waiter (get @waiting (:id tab))]
                                           (>! waiter result)))))

(defn run-script
  [{:keys [id]}]
  (let [result (chan)]
    (.. js/chrome -tabs (executeScript id #js {:file "content/main.js"}))
    ; Puts channel in waiting map
    (swap! waiting assoc id result)
    result))
~~~

And content side is more than simple:

~~~clojure
(go-loop []
  (if (ready?)
    (.. js/chrome -runtime (sendMessage #js {:status :ok
                                             :flights (clj->js (get-flights))}))
    (do (<! (timeout 500))
        (recur))))
~~~

We skip content's `get-flights` and `ready?` here, because it's just a parsing of html.

Back to the background's `get-flights`, now we can implement it:

~~~clojure
(defn get-flights
  [id-from id-to date]
  (go (let [search-format (formatter "dd+MMM")
            tab (<! (open-tab (make-url id-from id-to (unparse search-format date))))
            {:keys [id]} (js->clj tab :keywordize-keys true)
            {:keys [flights]} (<! (run-script tab))]
        (.. js/chrome -tabs (remove id))
        (map #(assoc % :date date) flights))))
~~~

So that hardcore action was simplified to simple and flat code.

Now we can go back to main function. We can't just use `concat` for a list of channels,
so we should implement something similar:

~~~clojure
(defn concat-flights
  [flights]
  (go-loop [[flight & flights] flights
            result []]
    (if flights
      (recur flights (concat result (<! flight)))
      result)))
~~~

It works just like `concat`, but accepts a list of channels and returns a single channel with
concatenated result.

And now the latest part &ndash; `presentat`, we just use `console.table` here, it
offers us fancy table view with sorting:

~~~clojure
(defn present
  [prices]
  (let [present-format (formatter "MM.dd")]
    (go (->> (<! prices)
             (map #(update % :date (fn [date] (unparse present-format date))))
             clj->js
             (.table js/console)))))
~~~

Now we can look to the result with flights from Saint-Petersburg (Russia)
to Denpasar (Indonesia, Bali) in range from the first day of September till
the first day of October:

![Result](/assets/flight.png)

Isn't it cool that this very complicated logic can be written as a simple flat code
almost without callback, and can be simplified to just a pipeline of short actions?

[Gist with the sources](https://gist.github.com/nvbn/b805e535e3bea9cee796).
