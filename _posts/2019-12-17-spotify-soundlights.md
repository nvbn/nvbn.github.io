---
layout: post
title: "Sound lights with Spotify and ESP8266"
date: 2019-12-17 00:50
keywords: python, spotify, soundlights, esp8266, micropython
image: /assets/spotify_lights/photo_all.jpg
---

As unfortunately my old [fancy sound lights setup](https://nvbn.github.io/2017/11/06/eps8266-soundlights/)
only works on Linux, it stopped working after I switched to a new laptop.
So I decided to make a cross-platform solution.

**TLDR:** [Source code of the desktop app, ESP8266 "firmware", a jupyter notebook with a preresearch](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558) and a video of sound lights in action
(the best my phone can do):

<iframe width="766" height="430" src="//www.youtube.com/embed/mBDA-S4Vhpg" frameborder="0" allowfullscreen></iframe>
<br />

### Lights colors from audio

Apparently, it's not so easy to capture and analyze audio stream from
a random music app on macOS, so I chose a bit of vendor locked
solution with
[a precalculated track analysis from Spotify API](https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-analysis/).
The API provides a bunch of differently sized intervals with characteristics like loudness, mode and etc:

![Available blocks](/assets/spotify_lights/sections.png)

By trial and error and some random changes, I came up with a function
that returns a list of tuples representing RGB colors.
It's not something fancy or at least correct, but can
produce different colors and works fast enough:

```python
def get_current_colors(t):
    segment = get_current_segmnet(t)
    section = get_current_section(t)
    beat = get_current_beat(t)

    beat_color = BASE_COLOR_MULTIPLIER * (t - beat['start'] + beat['duration']) / beat['duration']
    tempo_color = BASE_COLOR_MULTIPLIER * scale_tempo(section['tempo'])
    pitch_colors = [BASE_COLOR_MULTIPLIER * p for p in segment['pitches']]

    loudness_multiplier = 1 + LOUDNESS_MULTIPLIER * scale_loudness(section['loudness'])

    colors = ((beat_color * loudness_multiplier,
                tempo_color * loudness_multiplier,
                pitch_colors[n // (leds // 12)] * loudness_multiplier)
                for n in range(leds))

    if section['mode'] == 0:
        order = (0, 1, 2)
    elif section['mode'] == 1:
        order = (1, 2, 0)
    else:
        order = (2, 0, 1)

    ordered_colors = ((color[order[0]], color[order[1]], color[order[2]])
                        for color in colors)

    return [_scale_pixel(color) for color in ordered_colors]
```

To ensure that it works I ran it on a bunch of songs with a 60 "LEDs"
column for an each second:

![MGMT - One Thing Left to Try](/assets/spotify_lights/exp_mgmt.png)
![The Knife - Listen Now](/assets/spotify_lights/exp_knife.png)
![The Chemical Brothers - Eve Of Destruction](/assets/spotify_lights/exp_chem.png)
![Grimes - Kill V. Maim](/assets/spotify_lights/exp_grimes.png)
![Bon Voyage Organisation - Shenzhen V](/assets/spotify_lights/exp_bon.png)
![Salem - Trapdoor](/assets/spotify_lights/exp_salem.png)

It looks different enough and not that ugly
for different songs and different parts of songs.

[The full jupyter notebook available in the gist.](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558#file-presearch-ipynb)

### Led strip and EPS8266

The EPS8266 part is really easy, it listens UDP on 42424,
waits for 180 bytes and changes colors of 60 LEDs strip with
[NeoPixels MicroPython library](https://docs.micropython.org/en/latest/esp8266/tutorial/neopixel.html):

```python
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
```

Controlling it from a computer is also very easy:

```python
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

def send(pixels):
    colors = [color for pixel in pixels for color in pixel]
    line = array.array('B', colors).tostring()
    sock.sendto(line, ('192.168.2.255', 42424))
```

And it even works:

```python
send([(50, 0, 0)] * 60)
```
![Photo only red color](/assets/spotify_lights/photo_red.jpg)

```python
send([(0, 0, 50)] * 60)
```
![Photo only blue color](/assets/spotify_lights/photo_blue.jpg)

```python
send([(50, 50, 50)] * 5
     + [(50, 0, 0)] * 10
     + [(50, 50, 0)] * 10
     + [(0, 50, 0)] * 10
     + [(0, 50, 50)] * 10
     + [(0, 0, 50)] * 10
     + [(50, 50, 50)] * 5)
```
![Photo mixed leds colors](/assets/spotify_lights/photo_all.jpg)

[The full source code is simple and available in the gist.](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558#file-esp-py)

### The app that connects everything

![Architecture diagram](/assets/spotify_lights/architecture.png)

The app is fairly simple and essentially consists of two asyncio
coroutines and a queue as a messaging bus.

The first coroutine calls Spotify API
[current playing endpoint](https://developer.spotify.com/documentation/web-api/reference/player/get-the-users-currently-playing-track/),
fetches [audio analysis](https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-analysis/)
when the current playing song changes and produces three events:

* `EventStop` &ndash; nothing is playing;
* `EventSongChanged(analysis, start_time)` &ndash; song changed;
* `EventAdjustStartTime(start_time)` &ndash; sync song start time in case of discrepancies or manual changes.

```python
async def _listen_to_spotify_changes(session: aiohttp.ClientSession) -> AsyncIterable[Event]:
    current_id = None
    while True:
        request_time = time.time()
        current = await _get_current_playing(session)
        if not current['is_playing']:
            current_id = None
            yield EventStop()
        elif current['item']['id'] != current_id:
            current_id = current['item']['id']
            analysis = await _get_audio_analysis(session, current_id)
            yield EventSongChanged(analysis, _get_start_time(current, request_time))
        else:
            yield EventAdjustStartTime(_get_start_time(current, request_time))

        await asyncio.sleep(SPOTIFY_CHANGES_LISTENER_DEALY)


async def spotify_changes_listener(user_id: str,
                                   client_id: str,
                                   client_secret: str,
                                   events_queue: asyncio.Queue[Event]) -> NoReturn:
    while True:
        ...
        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                async for event in _listen_to_spotify_changes(session):
                    await events_queue.put(event)
            except Exception:
                logging.exception('Something went wrong with spotify_changes_listener')

                await asyncio.sleep(SPOTIFY_CHANGES_LISTENER_FAILURE_DELAY)
```

The second coroutine listens to those events and sends packets
to ESP8266:

```python
async def lights_controller(device_ip: str,
                            device_port: int,
                            leds: int,
                            events_queue: asyncio.Queue[Event]) -> NoReturn:
    while True:
        send_to_device = await make_send_to_device(device_ip, device_port)
        try:
            async for colors in _events_to_colors(leds, events_queue):
                send_to_device(colors)

        except Exception:
            logging.exception("Something went wrong with lights_controller")
            await asyncio.sleep(CONTROLLER_ERROR_DELAY)
```

[Full source code is a bit boring and available in the gist](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558#file-app-py),
to use it you will need to define some
[required environment variables](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558#file-run-sh).

### The result

It works, kind of reusable and even looks a bit nice in real life,
but not so nice when recorded on my phone:

<iframe width="766" height="430" src="//www.youtube.com/embed/VDZ7PR5WZf4" frameborder="0" allowfullscreen></iframe>

[Gist with everything.](https://gist.github.com/nvbn/73b613849cb176ec33057236b2fd4558)
