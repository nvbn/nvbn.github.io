function onYouTubeIframeAPIReady() {
    [].forEach.call(document.querySelectorAll('.gifify'), function(el) {
        var player = new YT.Player(el, {
            events: {
                'onReady': function () {
                    player.mute();
                    player.playVideo();
                },
                'onStateChange': function(state) {
                    if (state.data === 0) {
                        player.seekTo({seconds: 0});
                        player.playVideo();
                    }
                }
            }
        });
    });

    [].forEach.call(document.querySelectorAll('.mute-player'), function(el) {
        var player = new YT.Player(el, {
            events: {
                'onReady': function () {
                    player.mute();
                }
            }
        });
    });
}
