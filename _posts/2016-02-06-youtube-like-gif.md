---
layout:     post
title:      "Make youtube player look like a gif"
date:       2016-02-06 18:22:00 +03:00
keywords:   youtube, js
---

Sometimes I need to insert youtube video looped, without sound and without controls, basically it 
should work like a gif. I've tried [imgur video to gif](https://imgur.com/vidgif), but it limited to 15 seconds
video and a bit buggy (need to use http link instead of https).

And I thought that it would be easier
to just insert youtube player without controls and info, and use [IFrame API](https://developers.google.com/youtube/iframe_api_reference)
for looping (`loop` param works only with flash player) and muting.
 
So we need to insert IFrame API script and our script:

~~~html
<script src="//www.youtube.com/iframe_api"></script>
<script>
    function onYouTubeIframeAPIReady() {  // called automatically when IFrame API loaded
        [].forEach.call(document.querySelectorAll('.gifify'), function(el) {
            var player = new YT.Player(el, {
                events: {
                    'onReady': function () {
                        player.mute();
                        player.playVideo();
                    },
                    'onStateChange': function(state) {
                        if (state.data === 0) {  // video ended
                            player.seekTo({seconds: 0});
                            player.playVideo();
                        }
                    }
                }
            });
        });
    }
</script>
~~~

And then insert video with `?enablejsapi=1&showinfo=0&controls=0` params and `gifify` class, like:

~~~html
<iframe class="gifify" src="https://www.youtube.com/embed/4YKx9z6j1aA?enablejsapi=1&showinfo=0&controls=0" frameborder="0"></iframe>
~~~

In action:

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/4YKx9z6j1aA?enablejsapi=1&showinfo=0&controls=0" frameborder="0"></iframe>
