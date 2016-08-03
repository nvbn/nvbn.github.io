function onYouTubeIframeAPIReady() {
  [].forEach.call(document.querySelectorAll('.gifify'), function (el) {
    var player = new YT.Player(el, {
      events: {
        'onReady': function () {
          player.mute();
          player.playVideo();
        },
        'onStateChange': function (state) {
          if (state.data === 0) {
            player.seekTo({seconds: 0});
            player.playVideo();
          }
        }
      }
    });
  });

  [].forEach.call(document.querySelectorAll('.mute-player'), function (el) {
    var player = new YT.Player(el, {
      events: {
        'onReady': function () {
          player.mute();
        }
      }
    });
  });
}

function replaceSlowIframe(el) {
  var iframe = document.createElement('iframe');
  for (var i = el.attributes.length - 1; i >= 0; i--) {
    iframe[el.attributes[i].name] = el.attributes[i].value;
  }

  el.parentElement.replaceChild(iframe, el);
}

function expandSlowIframes() {
  [].forEach.call(document.querySelectorAll('.slow-iframe'), function (el) {
    replaceSlowIframe(el);
  });
}

function prepareSlowIframes() {
  [].forEach.call(document.querySelectorAll('.slow-iframe'), function (el) {
    var spoiler = document.createElement('a');
    spoiler.href = '#';
    spoiler.innerHTML = '[Expand example]';
    spoiler.addEventListener('click', function (e) {
      e.preventDefault();
      replaceSlowIframe(el);
    });

    el.appendChild(spoiler);
  });
}
