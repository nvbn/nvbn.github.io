---
layout:     post
title:      "Building a graph of flights from airport codes in tweets"
date:       2017-09-10 05:00:00
keywords:   python, graph, twitter, airport, flight
image:      /assets/flight/flight.png
---

A lot of people (at least me) tweet airports codes like *PRG ✈ AMS*
before flights. So I thought it will be interesting to draw a
directed graph of flights and airports. Where airports are nodes
and flights are edges.

First of all, I [created a twitter application](https://apps.twitter.com/),
authorized my account within it and got all necessary credentials:
  
```python
TWITTER_CONSUMER_KEY = ''
TWITTER_CONSUMER_SECRET = ''
TWITTER_ACCESS_TOKEN = ''
TWITTER_ACCESS_TOKEN_SECRET = ''
USER_ID = ''
```

As a special marker I chose airplane emoji:

```python
MARKER = '✈'
```

Then I tried to receive all my tweets with that marker but stuck with a huge problem,
twitter REST API doesn't work with emojis in a search query. So I decided to
receive a whole timeline and filter it manually. So only the last
[3200 tweets will be parsed](https://dev.twitter.com/rest/reference/get/statuses/user_timeline).
Working with twitter API is very easy with [tweepy](https://github.com/tweepy/tweepy):

```python
import tweepy


def get_tweets():
    auth = tweepy.OAuthHandler(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET)
    auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)
    api = tweepy.API(auth)
    cursor = tweepy.Cursor(api.user_timeline,
                           user_id=USER_ID,
                           exclude_replies='true',
                           include_rts='false',
                           count=200)
    return cursor.items()
```
```python
>>> for tweet in get_tweets():
...     print(tweet)
... 
Status(_api=<tweepy.api.API object at 0x7f876a303ac8>, ...)
```

Then I filtered tweets with *✈* in its text:

```python
flight_texts = (tweet.text for tweet in get_tweets()
                if MARKER in tweet.text)
```
```python
>>> for text in flight_texts:
...     print(text)
...
ICN ✈️ IKT
IKT ✈️ ICN
DME ✈️ IKT
```

As some tweets may contain more than one flight, like *LED ✈ DME ✈ AUH*,
it's convenient to extract all three letter parts and build flights
like *LED ✈ DME* and *DME ✈ AUH*:

```python
def get_flights(text):
    parts = [part for part in text.split(' ') if len(part) == 3]
    if len(parts) < 2:
        return []

    return zip(parts[:-1], parts[1:])


flights = [flight for text in flight_texts
           for flight in get_flights(text)]
uniq_flights = list(set(flights))
```
```python
>>> uniq_flights
[('ICN', 'IKT'), ('IKT', 'ICN'), ('DME', 'IKT')]
```

From edges in `uniq_flights` it's very easy to get all nodes:

```python
airports = [airport for flight in flights
            for airport in flight]
uniq_airports = list(set(airports))
```
```python
>>> uniq_airports
['ICN', 'IKT', 'DME']
```

So now it's possible to create a graph with [networkx](https://networkx.github.io/)
and draw it with [matplotlib](https://matplotlib.org/):

```python
import networkx
from matplotlib import pyplot


graph = networkx.DiGraph()
graph.add_nodes_from(uniq_airports)
graph.add_edges_from(uniq_flights)
networkx.draw(graph, with_labels=True, node_size=1000)
pyplot.draw()
pyplot.show()
```

The graph is very ugly:

<img src='/assets/flight/flight_ugly.svg' style='width: 100%' />

But it's simple to improve it by using different colors depending on
nodes and edges weight, and by using [graphviz](http://www.graphviz.org/).

```python
from collections import Counter
from matplotlib import cm


def get_colors(all_records, uniq_records):
    counter = Counter(all_records)
    max_val = max(counter.values())
    return [counter[record] / max_val
            for record in uniq_records]


networkx.draw(graph, 
              with_labels=True,
              node_size=1000,
              width=1.5,
              pos=networkx.nx_pydot.graphviz_layout(graph, prog='neato'),
              cmap=cm.get_cmap('Pastel1'),
              edge_cmap=cm.get_cmap('Pastel2'),
              edge_color=get_colors(flights, uniq_flights),
              node_color=get_colors(airports, uniq_airports))
pyplot.draw()
pyplot.show()
```

So now it's much nicer:

<img src='/assets/flight/flight.svg' style='width: 100%' />

[Gist with sources.](https://gist.github.com/nvbn/617dd73d7b4bf35877cf5c235a8861c8)
