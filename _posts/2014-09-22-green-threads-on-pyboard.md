---
layout:     post
title:      Green threads on pyboard
date:       2014-09-22 21:36:00
keywords:   green threads, micropython, pyboard, python
---

Some weeks ago i received new fancy device &mdash; [pyboard](http://micropython.org/).
It's like arduino, but using python instead of wiring. I was little disappointed, because micropython wasn't have multithreading module.

And i developed [microasync](https://github.com/nvbn/microasync) &mdash; library with green threads for micropython.

Little example, code for toggling leds concurrently:

~~~python
from microasync.async import loop, coroutine, Delay
import pyb


@coroutine  # decorator for making green thread from function
def toggle_led_on_interval(led, interval):
    while True:
        pyb.LED(led).toggle()
        yield Delay(interval)  # like time.sleep, but non-blocking


toggle_led_on_interval(1, 1)
toggle_led_on_interval(2, 2)
toggle_led_on_interval(3, 1)
toggle_led_on_interval(4, 2)

# start main loop:
loop()
~~~

And result:

<iframe width="766" height="430" src="//www.youtube.com/embed/xTzie-bQh8M" frameborder="0" allowfullscreen></iframe>
