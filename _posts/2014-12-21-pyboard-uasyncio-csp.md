---
layout:     post
title:      CSP on pyboard with uasyncio
date:       2014-12-21 00:43:00
keywords:   python, micropython, pyboard
---

Not so far ago [@pfalcon](https://github.com/pfalcon) mentioned in
[microasync bugtracker](https://github.com/nvbn/microasync/issues/1) about a port of
asyncio for micropython &ndash; [uasyncio](https://github.com/micropython/micropython-lib).
After that I ported asynchronous queue from asyncio to uasyncio, so now it can replace microasync.

So I conceived a little project: device which prints information from pyboard gyro sensor
and ultrasonic sensor to OLED display. Sounds very simple, but it need to update information
on display when data from one of sensors changed. So interaction with sensors should be non-blocking.

I found [almost well done lib](https://github.com/khenderick/micropython-drivers/)
([fork which supports drawing text](https://github.com/nvbn/micropython-drivers))
for interacting with my OLED display and [lib for working with ultrasonic sensor](https://github.com/skgsergio/MicropythonLibs/)
([non-blocking version](https://gist.github.com/nvbn/80c7b434ee21c99f013d#file-ultrasonic-py)).

First of all I created decorator for simplifying creating generators which returns a queue and
make all interaction through it:

```python
class OnlyChanged(Queue):
    def __init__(self, *args, **kwargs):
        self._last_val = None
        super().__init__(*args, **kwargs)

    def put(self, val):
        # Put in queue only if value changed
        if val != self._last_val:
            yield from super().put(val)
            self._last_val = val


def chan(fn):
    def wrapper(*args, **kwargs):
        q = OnlyChanged(1)
        get_event_loop().call_soon(fn(q, *args, **kwargs))
        return q
    return wrapper
```

So now it's simple to write generator, which prints to display data received from the queue:

```python
@chan
def get_display(q, *args, **kwargs):
    display = Display(*args, **kwargs)
    while True:
        lines = yield from q.get()
        display.write(lines)

>>> display = get_display(pinout={'sda': 'Y10',
...                               'scl': 'Y9'},
...                       height=64,
...                       external_vcc=False)
>>> yield from display.put('Hello world!')
```

![oled display](/assets/pyboard_csp_display.jpg)

And generator for the ultrasonic sensor which puts value to the queue:

```python
@chan
def get_ultrasonic(q, *args, **kwargs):
    ultrasonic = Ultrasonic(*args, **kwargs)
    while True:
        val = yield from ultrasonic.distance_in_cm()
        yield from q.put(val)

>>> ultrasonic = get_ultrasonic('X1', 'X2')
>>> yield from ultrasonic.get()
28.012
```

Similar generator for the pyboard gyro sensor:

```python
@chan
def get_gyro(q):
    accel = pyb.Accel()
    while True:
        val = accel.filtered_xyz()
        yield from q.put(val)

>>> gyro = get_gyro()
>>> yield from gyro.get()
(12, 9, 72)
```

And by combining all of them it's very similar to write program for expected device:

```python
def main():
    display = get_display(pinout={'sda': 'Y10',
                                  'scl': 'Y9'},
                          height=64,
                          external_vcc=False)
    current = {'dist': 0, 'xyz': (0, 0, 0)}
    shared_q = alts(dist=get_ultrasonic('X1', 'X2'),
                    xyz=get_gyro())
    while True:
        source, val = yield from shared_q.get()
        current[source] = val
        yield from display.put(
            'Distance: {:0.2f}cm\n'
            'x: {} y: {} z: {}'.format(current['dist'], *current['xyz']))


>>> loop = get_event_loop()
>>> loop.call_soon(main())
>>> loop.run_forever()
```

So the result code is very simple, all components are decoupled and it's easy to test.
Video of result:

<iframe width="766" height="430" src="//www.youtube.com/embed/G4nFRaAORxw" frameborder="0" allowfullscreen></iframe>

[Gist with source codes.](https://gist.github.com/nvbn/80c7b434ee21c99f013d)
