---
layout:     post
title:      FRP* on pyboard
date:       2014-10-15 20:52:00
keywords:   CSP, pyboard, micropython, microasync, reactive, FRP
---

When almost a year ago I watched interesting course
[Principles of Reactive Programming](https://www.coursera.org/course/reactive),
I found that many examples of FRP are about circuits and wires.
I tried to do something similar to course examples on arduino, but nothing good came,
mostly because low expressiveness of Wiring.

And now I trying to do it with [pyboard](http://micropython.org/) and my
[microasync](https://github.com/nvbn/microasync) library.

First of all, I wrote simple actor (not a really actor, but something similar)
for bicolor LED:

```python
from microasync.async import as_chan, do_all
from microasync.device import get_output_pin


@as_chan(Channel)  # now this function returns channel
def get_bicolor_led(chan, left, right):  # `channel` is this actor "mailbox"
    left_pin = get_output_pin(left)  # returns channel for a pin, when we put 1 in that 
    right_pin = get_output_pin(right)  # channel then voltage will be set to 3.3V; when we put 0 - 0V
    while True:
        msg = yield chan.get()  # receive message from a channel
        if msg == 'red':
            yield do_all(left_pin.put(1),  # do commands sequentially
                         right_pin.put(0))
        elif msg == 'green':
            yield do_all(left_pin.put(0),
                         right_pin.put(1))
        elif msg == 'yellow':
            yield do_all(left_pin.put(1),
                         right_pin.put(1))
        elif msg == 'none':
            yield do_all(left_pin.put(0),
                         right_pin.put(0))
```

This actor is simple to use, for changing color of LED we just need to send (put in channel)
`red`, `green`, `yellow` or `none`: 

```python
from microasync.async import coroutine


@coroutine
def test_bicolor_led():
    led = get_bicolar_led('X1', 'X2')
    yield led.put('red')  # switch LED color to red
    yield led.put('green')  # switch LED color to green
    yield led.put('yellow')  # switch LED color to yellow (red and green together)
    yield led.put('none')  # turn off LED

```

Then I created simple `filter` for channel, which can be toggled by button on pyboard:

```python
from microasync.async import as_chan, select
from microasync.device import get_switch


@as_chan(Channel)
def switchable_filter(chan, orig_chan, fn):
    # Returns channel from which we can get values from switch and this actor
    # "mailbox", works almost like `select` from golang:
    select_ch = select(get_switch(), chan)
    enabled = False
    while True:
        result_ch, val = yield select_ch.get()
        if result_ch == chan:
            if not enabled or fn(val):  # apply filter if filter enabled
                yield orig_chan.put(val)
        else:
            enabled = not enabled  # toggle filter state
```

Now I created simple coroutine, which sends `red`, `green`, `yellow` and `none`
to two LEDs sequentially in loop. And when we click button on pyboard we
toggle filter, which passess all messages except `red` to the first LED
and only `red` to the second LED:

```python
from microasync.async import coroutine


@coroutine
def main():
    first_led = switchable_filter(get_bicolar_led('X1', 'X2'),  # creates bicolor led and applies filter
                                  lambda msg: msg != 'red') 
    second_led = switchable_filter(get_bicolar_led('X3', 'X4'),
                                   lambda msg: msg == 'red')
    while True:
        for led in (first_led, second_led):
            for mode in ('red', 'green', 'yellow', 'none'):
                yield led.put(mode)  # sends red, green, yellow, none 
```

Full source code of example available on
[github](https://github.com/nvbn/microasync/blob/master/examples/reactive.py). And video with result:

<iframe width="766" height="430" src="//www.youtube.com/embed/kxesoQ2jF5g" frameborder="0" allowfullscreen></iframe>

<sub>* not a really FRP, but almost follows [The Reactive Manifesto](http://www.reactivemanifesto.org/)</sub>
