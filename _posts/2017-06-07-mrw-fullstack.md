---
layout:     post
title:      "How I was Full Stack and wrote a mediocre service for searching reaction gifs"
date:       2017-06-07 01:00:00
keywords:   clojure, python, javascript, docker, react-native
image:      /assets/mrwwtf.png
---

![screenshot](/assets/mrwwtf.png)

A while ago I discovered that people often use [MRW](https://www.reddit.com/r/MRW/)
as a reply in messengers. And not knowing that nowadays even Android keyboard
have an option to search gifs, I decided to write some service with a mobile app,
a web app and even a Telegram bot, that will do that.
 
The idea was pretty simple, just parse Reddit, somehow index gifs and allow users
to search and share reaction gifs in all possible ways. [The result](https://mrw.wtf/)
was mediocre at best.

[*MRW result is mediocre at best*](https://mrw.wtf/mrw/result%20is%20mediocre%20at%20best)

[![result is mediocre at best](http://i.imgur.com/fn1IxJj.gif)](https://mrw.wtf/mrw/result%20is%20mediocre%20at%20best)

The first part is [the parser](https://github.com/nvbn/mrw.wtf/tree/master/mrw-parser),
it's pretty simple and can do just two things:

* index `n` top of all time posts from `r/MRW` on an initial run;
* index `n` top today posts every 12 hours.  

While indexing it gets appropriate links from Reddit's own images hosting or Imgur,
got additional information from nlp-service and put everything in ElasticSearch.

I decided to write it in Clojure because wanted to. The only problem was that [Elastisch](http://clojureelasticsearch.info/),
a Clojure client for ElasticSearch, wasn't (doesn't?) work with the latest version of ElasticSearch.
But ElasticSearch REST API is neat, and I just used it.

[*MRW library doesn't work with the latest elasticsearch*](https://mrw.wtf/mrw/library%20doesn't%20work%20with%20the%20latest%20elasticsearch)

[![library doesn't work with the latest elasticsearch](http://i.imgur.com/j4xzeKe.gif)](https://mrw.wtf/mrw/library%20doesn't%20work%20with%20the%20latest%20elasticsearch)

The next and the most RAM consuming part is [the nlp-service](https://github.com/nvbn/mrw.wtf/tree/master/mrw-nlp),
it's written in Python with [NLTK](http://www.nltk.org/) and [Flask](http://flask.pocoo.org/). It also
can do just two things:

* sentiment analysis of a sentence, like `{"sentiment": "happiness"}` for "someone congrats me";
* VADER, which is a some sort of sentiment analysis too, like `{"pos": 0.9, "neg": 0.1, "neu": 0.2}`
for the same sentence.

It doesn't work very well, because I'm amateur at best in NLP, and had a too small dataset. I was
and still planning to make a better dataset with [Mechanical Turk](https://www.mturk.com/mturk/welcome)
in the future.

[*MRW I have too small dataset*](https://mrw.wtf/mrw/I%20have%20too%20small%20dataset)

[![I have too small dataset](http://i.imgur.com/yRHwZIh.gif)](https://mrw.wtf/mrw/I%20have%20too%20small%20dataset)

The last non-client part is [the public facing API](https://github.com/nvbn/mrw.wtf/tree/master/mrw-server),
it's also very simple, written in Clojure, Ring and Compojure. It has just one endpoint
`/api/v1/search/?query=query`. It just requests additional information for the `query`
from nlp-service and searches appropriate gifs in ElasticSearch. Nothing interesting.

[*MRW public facing api is boring*](https://mrw.wtf/mrw/public%20facing%20api%20is%20boring)

[![public facing api is boring](http://i.imgur.com/g17Cvd5.gif)](https://mrw.wtf/mrw/public%20facing%20api%20is%20boring)

The first client is [the web app](https://mrw.wtf/) ([source](https://github.com/nvbn/mrw.wtf/tree/master/mrw-app)).
It's neat, has just one text input for `query` and written with ClojureScript and
[reagent](https://github.com/reagent-project/reagent). And it's so small, that I don't even
use [re-frame](https://github.com/Day8/re-frame) here.

[*MRW the web app is neat*](https://mrw.wtf/mrw/the%20web%20app%20is%20neat)

[![the web app is neat](http://i.imgur.com/4dUJvWI.gif)](https://mrw.wtf/mrw/the%20web%20app%20is%20neat)

The second client is [the mobile app](https://play.google.com/store/apps/details?id=com.mrwapp)
([source](https://github.com/nvbn/mrw.wtf/tree/master/mrw-app)).
It can search for reaction gifs and can share found gifs to other apps. It's written with
React Native in JavaScript and works only on Android. Yep, I managed to write non-cross-platform
RN app, but at least I'm planning to make it cross-platform and publish it to the AppStore.

[*MRW I managed to write non-cross-platform RN app*](https://mrw.wtf/mrw/I%20managed%20to%20write%20non-cross-platform%20RN%20app)

[![I managed to write non-cross-platform RN app](http://i.imgur.com/QcafGj2.gif)](https://mrw.wtf/mrw/I%20managed%20to%20write%20non-cross-platform%20RN%20app)

And the last and the most hipsterish client is [the Telegram bot](http://t.me/mrw_wtf_bot)
([source](https://github.com/nvbn/mrw.wtf/tree/master/mrw-telegram)). It has three types of responses:

* to `/mrw query` with appropriate reaction gif;
* to just `/mrw` with famous Travolta gif;
* to `/help` with obviously help message.

And it's written in JavaScript with [Node.js Telegram Bot API](https://github.com/yagop/node-telegram-bot-api).

[*MRW I can't find Travolta gif*](https://mrw.wtf/mrw/I%20can't%20find%20Travolta%20gif)

[![I can't find Travolta gif](http://i.imgur.com/VFOz9ne.gif)](https://mrw.wtf/mrw/I%20can't%20find%20Travolta%20gif)

The last part is [deploy](https://github.com/nvbn/mrw.wtf/tree/master/deploy). Everything is deployed
on [docker-cloud](https://cloud.docker.com/). I somehow managed to configure everything a few days
before [swarm mode announce](https://forums.docker.com/t/introducing-docker-cloud-beta-swarm-mode/29160),
so it's just stacks. But it wouldn't be a problem to migrate to new swarm mode. The service
is deployed as eight containers:

* ElasticSearch;
* nginx proxy;
* letsencrypt nginx proxy companion;
* the nlp-service;
* the public API;
* the parser;
* the web app (data container);
* the Telegram bot.

Almost everything worked out of the box, I only changed nginx proxy image to simplify serving
assets of the web app. And it's more than nice, when I push changes to github,
docker-cloud rebuilds images and redeploys containers.

[*MRW almost everything works out of the box*](https://mrw.wtf/mrw/almost%20everything%20works%20out%20of%20the%20box)

[![almost everything works out of the box](http://i.imgur.com/W2FYqaH.gif)](https://mrw.wtf/mrw/almost%20everything%20works%20out%20of%20the%20box)

Summing up everything, it was a totally full stack experience from the cluster on docker-cloud
with microservices to the Telegram bot and the mobile app. And the result isn't
the worst part, the worst part is that as a part of my studying I've made
[a presentation for future Software Engineers about that service in Czech](https://docs.google.com/presentation/d/1ojKRO3cXym7euJ4LfQam31PSnsOhomeBEilEtO_S2n8/edit?usp=sharing).

[*MRW I've made a presentation*](https://mrw.wtf/mrw/I've%20made%20a%20presentation)

[![I've made a presentation](http://i.imgur.com/MlUwb27.gif)](https://mrw.wtf/mrw/I've%20made%20a%20presentation)

[Sources on github](https://github.com/nvbn/mrw.wtf), [the web app](https://mrw.wtf/),
[the mobile app](https://play.google.com/store/apps/details?id=com.mrwapp),
[the Telegram bot](http://t.me/mrw_wtf_bot).
