---
layout:     post
title:      "Talking with Hubot through Google Glass"
date:       2016-01-11 15:12:00
keywords:   kotlin, hubot, google glass, coffeescript
---

For home automation I use [Hubot](https://hubot.github.com), it's something like a framework
for creating chat bots, it's very easy to use
and rules for it can be written in CoffeeScript, like:

```coffeescript
robot.hear /pause move/i, (res) ->
  exec 'player pause'
  res.send 'Sure!'
```

So I planned to create an app for phone, which would allow me to say "Ok Google, Hubot, next song",
or something similar. But it's not possible, Android API not allow
to create [custom voice actions](https://developers.google.com/voice-actions/custom-actions) like "Hubot",
only commands from [predefined list](https://developers.google.com/voice-actions/system/) allowed.

But I remembered that I have useless Google Glass, which GDK API allows to
create custom "Ok Glass" commands, like "Ok Glass, Hubot, next song", at least in development mode with:

```xml
<uses-permission android:name="com.google.android.glass.permission.DEVELOPMENT" />
```

First of all I created Hubot adapter which support something like polling with simple API:

* POST `/polling/subscribe/` with `{}` respond s`{user: user}` &ndash; subscribe to polling;
* POST `/polling/message/` with `{user: user, text: message-text}` responds `{ok: ok}` &ndash; send message to bot;
* GET `/polling/response/:user/` responds `{responses: [response]}` &ndash; get unread bot responses.

It's not so interesting, written in CoffeeScript (Hubot requires it), [code is very simple](https://github.com/nvbn/hubot-glass/blob/master/hubot-polling/index.coffee).

For Glass part I've used Kotlin with a few nice libraries:

* [anko](https://github.com/Kotlin/anko) as sugar for Android API;
* [kotson](https://github.com/SalomonBrys/Kotson) for working with JSON;
* [fuel](https://github.com/kittinunf/Fuel) as HTTP client;
* [kovenant](https://github.com/mplatvoet/kovenant) for promises.

And it's very great combination, with them making http request is much nicer than with java and just `DefaultHttpClient`, like:

```kotlin
Fuel.post("$url/polling/message/")
    .body(jsonObject("user" to user, "text" to text).toString())
    .header("Content-Type" to "application/json")
    .jsonPromise()
    .success { info("Message $text sent") }
    .fail { warn("Can't send message $text because $it") }
```

Just promises in comparison with [Clojure core.async](https://github.com/clojure/core.async)
and [Scala Akka](http://akka.io/) it's a bit way back, it's like writing in pre ES7 JavaScript. 
So why Kotlin? It's simpler to use on Android, struggling with dex errors with Scala isn't fun. Performance 
is similar to apps written in Java, sometimes startup time of Clojure apps is annoying. And
there's far less magic then in [Scala scaloid](https://github.com/pocorall/scaloid) and [Clojure Neko](http://github.com/clojure-android/neko).

In action:

<div style="background: black; text-align: center;"><a href='https://raw.githubusercontent.com/nvbn/hubot-glass/master/example.gif'><img src='https://raw.githubusercontent.com/nvbn/hubot-glass/master/example.gif' /></a></div>

[Sources on github.](https://github.com/nvbn/hubot-glass/)
