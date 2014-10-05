---
layout:     post
title:      CSP on pyboard
date:       2014-10-05 07:26:00
keywords:   CSP, pyboard, micropython, js, javascript, clojure, clojurescript, core.async
---

Lately i worked a lot with clojure and core.async, and i was very impressed with [CSP](http://en.wikipedia.org/wiki/Communicating_sequential_processes).
Mostly because it saves me from js callback hell.
For example, js code with sequential http requests (heh, with promises it's less ugly):

```javascript
$http.get('/users/').then(function(data){
    return $http.post('/user-data/', data.items);
}).then(function(){
    return $http.get('/posts/');
}).then(function(posts){
    console.log(posts);
});
```
With clojurescript and core.async it will be:

```clojure
(go (let [users (<! (http/get "/users/"))]
       (<! (http/post "/user-data/" (:items users)))
       (js/console.log (<! (http/get "/posts/")))))
```
Clojurescript code looks more readable and simple.

And i developed CSP for micropython in my [microasync](https://github.com/nvbn/microasync) library.

Example application &mdash; servo should rotate to angle which equal to
X angle of accelerometer, and user can start/stop app with button:

```python
from microasync.device import get_servo, get_accel, get_switch
from microasync.async import coroutine, loop, Delay, select


@coroutine
def servo_coroutine():
    servo, _ = get_servo(1)  # get_servo returns set and get channels
    accel = get_accel()
    switch = get_switch()
    on = False
    x = 0
    accel_or_switch = select(switch, accel)  # like select from go and like clojure core.async alts!
    while True:
        chan, val = yield accel_or_switch.get()  # like clojure (<! (accel_or_switch))
        if chan == accel:
            x, *_ = val  # we don't need y and z
        elif chan == switch:
            on = not on

        if on:
            yield servo.put(x)  # like clojure (>! servo x)
        yield Delay(0)  # like clojure (<! (timeout 0))


servo_coroutine()
loop()

```
And recorded on google glass (yep, i bought it few days ago) video of result:
<iframe width="766" height="430" src="//www.youtube.com/embed/CmgqT2OMxOA" frameborder="0" allowfullscreen></iframe>
