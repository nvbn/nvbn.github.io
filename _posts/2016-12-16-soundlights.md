---
layout:     post
title:      "Soundlights with Raspberry Pi and NeoPixel Strip"
date:       2016-12-16 17:00:00
keywords:   raspberry pi, neopixels, python
---

About a month ago I bought some NeoPixel clone and decided to create a
garland/soundlights for Christmas.

**TLDR:**

<iframe width="766" height="431" src="https://www.youtube.com/embed/2B_E62ZpD90?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

The first problem was to analysing of audio stream in real time, so I found
a nice console audio visualizer &ndash; [cava](https://github.com/karlstav/cava).
And changed it a bit, now instead of showing nice looking bars through ncurses
it just prints height of bars. It was done with a little patch:

~~~diff
diff --git a/cava.c b/cava.c
index 48482d6..13e7ce1 100644
--- a/cava.c
+++ b/cava.c
@@ -792,13 +792,6 @@ as of 0.4.0 all options are specified in config file, see in '/home/username/.co
                        f[i] = 0;
                }
 
-               #ifdef NCURSES
-               //output: start ncurses mode
-               if (om == 1 || om ==  2) {
-                       init_terminal_ncurses(color, bcolor, col, bgcol);
-                       get_terminal_dim_ncurses(&w, &h);
-               }
-               #endif
 
                if (om == 3) get_terminal_dim_noncurses(&w, &h);
 
diff --git a/output/raw.c b/output/raw.c
index b3b9d1e..16196b9 100644
--- a/output/raw.c
+++ b/output/raw.c
@@ -5,6 +5,13 @@
 
 int print_raw_out(int bars, int fp, int is_bin, int bit_format, int ascii_range, char bar_delim, char frame_delim, int f[200]) {
        int i;
+        for (i = 0; i <  bars; i++) {
+               uint8_t f8 = ((float)f[i] / 10000) * 255;
+               printf("%d ", f8);
+        }
+        printf("\n");
+        return 0;
+
 
        if (is_bin == 1){//binary
                if (bit_format == 16 ){//16bit:
~~~

Created special config where `bars` equals to count of leds on the strip:

~~~ini
[general]
bars = 60

[output]
bit_format = 8bit
method = raw
style = mono
~~~

And it works:

~~~bash
➜  cava git:(master) ✗ ./cava -p soundlights/cava_config
15 22 34 22 15 11 16 11 8 7 11 8 12 8 8 5 4 6 4 5 4 5 4 4 6 10 8 12 8 12 15 14 9 11 9 14 21 14 20 30 20 16 19 17 13 14 10 9 8 9 8 5 5 7 7 11 10 11 8 7 
25 38 58 38 25 18 28 20 14 17 26 18 21 14 16 13 9 10 8 11 7 9 11 9 14 21 21 20 15 23 26 24 17 23 17 24 37 24 35 52 35 28 32 30 22 24 18 16 14 16 16 11 10 15 12 18 18 19 14 14 
33 50 75 50 34 24 36 27 19 24 36 24 27 20 27 19 13 13 12 15 15 13 15 12 19 28 31 26 20 31 33 31 23 32 22 31 47 31 45 67 45 36 42 38 28 31 23 21 19 21 21 16 14 20 16 24 23 25 19 18 
39 58 87 58 47 32 41 32 22 29 44 29 31 24 34 24 19 15 15 18 20 15 18 15 22 34 38 30 24 37 39 36 28 38 26 36 55 36 52 78 52 42 48 44 33 36 26 24 22 24 25 19 17 23 19 28 27 29 22 21 
~~~

Next problem was converting of bars heights to colors, I made it simple as possible. Max bar height is 256,
so I generated 256 colors with [code found on Quora](https://www.quora.com/How-do-I-generate-n-visually-distinct-RGB-colours-in-Python/answer/Reed-Oei):

~~~python
def _get_spaced_colors(n):
    max_value = 16581375
    interval = int(max_value / n)
    colors = [hex(i)[2:].zfill(6) for i in range(0, max_value, interval)]

    return [(int(i[:2], 16), int(i[2:4], 16), int(i[4:], 16)) for i in colors]
~~~

After that I was need to changing led colors from Raspberry Pi, first of all I connected
the strip to the board. In [documentation](https://learn.adafruit.com/neopixels-on-raspberry-pi/wiring)
they say that the strip should be connected with some level converter and should use external power,
but mine works just fine connected straight to Raspberry Pi:

* ground → ground PIN;
* power → 3.3V PIN;
* logic → GPIO PIN 18.

As a software part I used Python library [rpi_ws281x](https://github.com/jgarff/rpi_ws281x)
and created little app, that reads from stdin and changes leds colors:

~~~python
import sys
from neopixel import Adafruit_NeoPixel, Color

# LED strip configuration:
LED_COUNT = 60  # Number of LED pixels.
LED_PIN = 18  # GPIO pin connected to the pixels (must support PWM!).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 5  # DMA channel to use for generating signal (try 5)
LED_BRIGHTNESS = 255  # Set to 0 for darkest and 255 for brightest
LED_INVERT = False # True to invert the signal (when using NPN transistor level shift)

# Colors:
COLORS_COUNT = 256
COLORS_OFFSET = 50


def _get_strip():
    strip = Adafruit_NeoPixel(
        LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS)

    strip.begin()

    for i in range(strip.numPixels()):
        strip.setPixelColor(i, Color(0, 0, 0))

    strip.setBrightness(100)

    return strip


def _get_spaced_colors(n):
    max_value = 16581375
    interval = int(max_value / n)
    colors = [hex(i)[2:].zfill(6) for i in range(0, max_value, interval)]

    return [(int(i[:2], 16), int(i[2:4], 16), int(i[4:], 16)) for i in colors]


def _handle_stdin(colors, strip):
    while True:
        try:
            nums = map(int, sys.stdin.readline()[:-1].split())
            for i, num in enumerate(nums):
                strip.setPixelColor(i, Color(*colors[num]))

            strip.show()
        except Exception as e:
            print e


if __name__ == '__main__':
    _handle_stdin(_get_spaced_colors(COLORS_COUNT),
                  _get_strip())
~~~

For sending data to Raspberry Pi I just used ssh, like:

~~~bash
./cava -p soundlights/cava_config | ssh pi@retropie.local sudo python soundlights.py
~~~

But there was a problem with buffering, but `unbuffer` from [expect](http://expect.sourceforge.net/) solved it:

~~~bash
unbuffer ./cava -p soundlights/cava_config | ssh pi@retropie.local sudo python soundlights.py
~~~

And that's all.

[Sources on github.](https://github.com/nvbn/soundlights)
