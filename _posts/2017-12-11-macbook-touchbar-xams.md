---
layout:     post
title:      "Christmas lights on MacBook TouchBar"
date:       2017-12-11 22:00:00
keywords:   js, electron, macbook, touchbar
image:      /assets/macbook_xmas.jpg
---

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/cu1Kg3BGnTA?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

MacBook TouchBar is almost useless, so I decided to put Christmas lights on it.
And apparently it was very easy. Electron has very simple [API for TouchBar](https://github.com/electron/electron/blob/master/docs/api/touch-bar.md).

As Christmas lights should have distinctive colors, I hardcoded just seven of them:

~~~javascript
const colors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#ffffff',
];
~~~

And as only one colorable element in electron API is `TouchBarButton`, and there's space for only
eight buttons on the TouchBar, I generated them with defined colors:

~~~javascript
const count = 8;

const lights = [];
for (let i = 0; i < count; i++) {
    lights.push(
        new TouchBarButton({
            backgroundColor: colors[i * 3 % colors.length],
        })
    );
}
~~~

Centered them with an ugly hack with `TouchBarLabel`:

~~~javascript
const touchBar = new TouchBar([
    new TouchBarLabel({label: "      "}),
    ...lights,
]);
~~~

Assigned `TouchBar` to a dummy electron app:

~~~javascript
app.once('ready', () => {
  window = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hiddenInset',
    width: 300,
    height: 100,
  });
  window.loadURL('javascript:document.write("<br><h1>Christmas lights!!!</h1>")');
  window.setTouchBar(touchBar);
});
~~~

The last part is the logic of the lights. I made it very simple, every five milliseconds
I'm increasing tick and updating colors of buttons with number have the same modulo
of three as the tick:

~~~javascript
const interval = 500;

let tick = 0;
setInterval(() => {
    for (let i = 0; i < count; i++) {
        if (i % 3 === tick % 3) {
            let index = colors.indexOf(lights[i].backgroundColor);
            index += 1;
            if (index >= colors.length) {
                index = 0;
            }

            lights[i].backgroundColor = colors[index];
        }
    }

    tick++;
}, interval);
~~~

By the end I just run the script with electron and got semi-nice Christmas lights and kind of Christmas spirit:

~~~bash
electron macbook_touchbar_christmas_lights.js
~~~

[Gist with sources.](https://gist.github.com/nvbn/0dd46fc91a4a0db34cd37d454d4cb7ed).
