---
layout:     post
title:      "Make KissCartoon usable with Chromecast"
date:       2017-12-06 20:50:00
keywords:   chrome, js, chromecast, kisscartoon
---

[KissCartoon](http://kisscartoon.es/) is a nice place to watch cartoons,
but it's not usable with Chromecast at all. It doesn't play next episode automatically.
But it's very easy to fix with a small Chrome extension. **TLDR:** [Castable KissCartoon](https://chrome.google.com/webstore/detail/castable-kisscartoon/bjcojegodnfapkdbbnmohcpkfemnjpfj).

So how it works?

When you open a page with a player, it's starting to listen for an `ended` event:

~~~javascript
const enableAutoplay = (player) => player.addEventListener('ended', () => {
  window.localStorage.setItem('autoPlayingBefore', location.href);
  document.getElementById('btnNext').click();
}, false);
~~~

When the event emits, it puts current URL in `localStorage` and clicks next button.
After the next page is loaded, it ensures that the previous page is the page with
the previous episode:

~~~javascript
const isContinuingPlaying = () => {
  const previous = window.localStorage.getItem('autoPlayingBefore');
  window.localStorage.removeItem('autoPlayingBefore');

  const [previousBtn] = document.getElementsByClassName('preev');

  return previousBtn.href === previous;
};
~~~

If the extension is sure that we on the page with the next episode, it toggles fullscreen.
But we can't actually toggle fullscreen, it's not possible to call `requestFullscreen` because
it can be called only from a callback initiated by a user event. So the extension uses a little
hack. It dims other elements on the page and expands the player by setting `position: fixed`.
And it works well with Chromecast, the player fills the whole TV.

~~~javascript
const enableFullscreen = (player) => {
  const offlight = document.getElementById('offlight');
  player.style.setProperty('position', 'fixed');
  offlight.click();

  let isExited = false;
  document.addEventListener('keyup', ({keyCode}) => {
    if (keyCode === 27 && !isExited) {
      player.style.setProperty('position', '');
      offlight.click();
      isExited = true;
    }
  });
};
~~~

And that's all! [Source code](https://github.com/nvbn/castable_kisscartoon),
[Chrome extension](https://chrome.google.com/webstore/detail/castable-kisscartoon/bjcojegodnfapkdbbnmohcpkfemnjpfj).
