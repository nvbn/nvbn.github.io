---
layout:     post
title:      "Soundlights with ESP8266 and NeoPixel Strip"
date:       2017-11-06 23:40:00
keywords:   esp8266, neopixels, python
image:      /assets/soundlights_esp8266.jpg
---

<iframe width="766" height="431" src="https://www.youtube.com/embed/dM77-6RnOAQ?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>
About a year ago I made [soundlights with Raspberry Pi](https://nvbn.github.io/2016/12/16/soundlights/).
But RPI is a bit of an overkill for this simple task and it's quite big,
doesn't have WiFi out of the box and practically can't be used without a power adapter.

So I decided to port soundlights to ESP8266. The main idea was to reuse as
much as possible from the previous implementation, so the parts with patched
audio visualizer and colors generation are the same. In a few words,
I've patched [cava](https://github.com/karlstav/cava) to print numbers
instead of showing pretty bars in a terminal. And I've generated colors
with [a code found on Quora](https://www.quora.com/How-do-I-generate-n-visually-distinct-RGB-colours-in-Python/answer/Reed-Oei).

And in current implementation I decided to make it very simple to use,
the only requirement is to have a machine with cava and ESP8266
on the same WiFi network. So I chose UDP broadcasting as a way to 
send data to ESP8266. And because there's just 60 LEDs and color of
a LED is three values from 0 to 255, colors for all strip is just
180 bytes. So it fits in one UDP packet.

Let's start with the part with cava:

~~~python
import sys
import socket
import array


COLORS_COUNT = 256
COLORS_OFFSET = 50


def get_spaced_colors(n):
    max_value = 16581375
    interval = int(max_value / n)
    colors = [hex(i)[2:].zfill(6) for i in range(0, max_value, interval)]

    return [(int(color[:2], 16),
             int(color[2:4], 16),
             int(color[4:6], 16)) for color in colors]


def send(colors):
    line = array.array('B', colors).tostring()
    sock.sendto(line, ('255.255.255.255', 42424))


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

colors = get_spaced_colors(COLORS_COUNT)

while True:
    try:
        nums = map(int, sys.stdin.readline()[:-1].split())
        led_colors = [c for num in nums for c in colors[num]]
        send(led_colors)
    except Exception as e:
        print(e)
~~~

It can be used like:

~~~python
unbuffer ./cava -p soundlights/cava_config | python cava/soundlights/esp/client.py
~~~

And it just reads numbers from cava output, generates colors, transforms them to bytes
and broadcasts them at 42424 port.

The ESP8266 part is even simpler:

~~~python
import socket
import machine
import neopixel


np = neopixel.NeoPixel(machine.Pin(5), 60)
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(('', 42424))


while True:
    line, _ = sock.recvfrom(180)

    if len(line) < 180:
        continue

    for i in range(60):
        np[i] = (line[i * 3], line[i * 3 + 1], line[i * 3 + 2])

    np.write()
~~~

It just receives broadcasts from 42424 port and changes colors of LEDs.

At the end, this version has less code and just works.
It's even some sort of IoT and with some effort can become a wearable device.
 
[Github.](https://github.com/nvbn/soundlights)
