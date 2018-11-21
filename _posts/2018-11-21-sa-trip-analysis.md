---
layout:     post
title:      "Analysing the trip to South America with a bit of image recognition"
date:       2018-11-21 01:30:00
keywords:   python, pandas, tensorflow
image:      /assets/sa_after/tags_by_city.png
---

Back in September, I had a three weeks trip to South America. While planning the trip I was using
sort of [data mining to select the most optimal flights](/2018/07/10/trip-planner/) and it worked well.
To continue following the data-driven approach (more buzzwords), I've decided to analyze the data I've
collected during the trip.

Unfortunately, I was traveling without local sim-card and almost without internet,
I can't use Google Location History as in [the fun research about the commute](/2018/05/01/commute/).
But at least I have tweets and a lot of photos.

At first, I've [reused old code](2017/09/10/airports-graph/) (more internal linking)
and extracted information about flights from tweets:

~~~python
all_tweets = pd.DataFrame(
    [(tweet.text, tweet.created_at) for tweet in get_tweets()],  # get_tweets available in the gist
    columns=['text', 'created_at'])

tweets_in_dates = all_tweets[
    (all_tweets.created_at > datetime(2018, 9, 8)) & (all_tweets.created_at < datetime(2018, 9, 30))]

flights_tweets = tweets_in_dates[tweets_in_dates.text.str.upper() == tweets_in_dates.text]

flights = flights_tweets.assign(start=lambda df: df.text.str.split('✈').str[0],
                                finish=lambda df: df.text.str.split('✈').str[-1]) \
                        .sort_values('created_at')[['start', 'finish', 'created_at']]
~~~
~~~python
>>> flights
   start finish          created_at
19  AMS   ️ LIS 2018-09-08 05:00:32
18  LIS   ️ GIG 2018-09-08 11:34:14
17  SDU   ️ EZE 2018-09-12 23:29:52
16  EZE   ️ SCL 2018-09-16 17:30:01
15  SCL   ️ LIM 2018-09-19 16:54:13
14  LIM   ️ MEX 2018-09-22 20:43:42
13  MEX   ️ CUN 2018-09-25 19:29:04
11  CUN   ️ MAN 2018-09-29 20:16:11
~~~

Then I've found [a json dump with airports](https://github.com/mwgg/Airports), made a little hack
with replacing Ezeiza with Buenos-Aires and found cities with lengths of stay from flights:

~~~python
flights = flights.assign(
    start=flights.start.apply(lambda code: iata_to_city[re.sub(r'\W+', '', code)]),  # Removes leftovers of emojis, iata_to_city available in the gist
    finish=flights.finish.apply(lambda code: iata_to_city[re.sub(r'\W+', '', code)]))
cities = flights.assign(
    spent=flights.created_at - flights.created_at.shift(1),
    city=flights.start,
    arrived=flights.created_at.shift(1),
)[["city", "spent", "arrived"]]
cities = cities.assign(left=cities.arrived + cities.spent)[cities.spent.dt.days > 0]
~~~
~~~python
>>> cities
              city           spent             arrived                left
17  Rio De Janeiro 4 days 11:55:38 2018-09-08 11:34:14 2018-09-12 23:29:52
16  Buenos-Aires   3 days 18:00:09 2018-09-12 23:29:52 2018-09-16 17:30:01
15  Santiago       2 days 23:24:12 2018-09-16 17:30:01 2018-09-19 16:54:13
14  Lima           3 days 03:49:29 2018-09-19 16:54:13 2018-09-22 20:43:42
13  Mexico City    2 days 22:45:22 2018-09-22 20:43:42 2018-09-25 19:29:04
11  Cancun         4 days 00:47:07 2018-09-25 19:29:04 2018-09-29 20:16:11

>>> cities.plot(x="city", y="spent", kind="bar",
                legend=False, title='Cities') \
          .yaxis.set_major_formatter(formatter)  # Ugly hack for timedelta formatting, more in the gist
~~~
![Cities](/assets/sa_after/cities.png)

Now it's time to work with photos. I've downloaded all photos from Google Photos,
parsed creation dates from Exif, and "joined" them with cities by creation date:

~~~python
raw_photos = pd.DataFrame(list(read_photos()), columns=['name', 'created_at'])  # read_photos available in the gist

photos_cities = raw_photos.assign(key=0).merge(cities.assign(key=0), how='outer')
photos = photos_cities[
    (photos_cities.created_at >= photos_cities.arrived)
    & (photos_cities.created_at <= photos_cities.left)
]
~~~
~~~python
>>> photos.head()
                          name          created_at  key            city           spent             arrived                left
1   photos/20180913_183207.jpg 2018-09-13 18:32:07  0    Buenos-Aires   3 days 18:00:09 2018-09-12 23:29:52 2018-09-16 17:30:01
6   photos/20180909_141137.jpg 2018-09-09 14:11:36  0    Rio De Janeiro 4 days 11:55:38 2018-09-08 11:34:14 2018-09-12 23:29:52
14  photos/20180917_162240.jpg 2018-09-17 16:22:40  0    Santiago       2 days 23:24:12 2018-09-16 17:30:01 2018-09-19 16:54:13
22  photos/20180923_161707.jpg 2018-09-23 16:17:07  0    Mexico City    2 days 22:45:22 2018-09-22 20:43:42 2018-09-25 19:29:04
26  photos/20180917_111251.jpg 2018-09-17 11:12:51  0    Santiago       2 days 23:24:12 2018-09-16 17:30:01 2018-09-19 16:54:13
~~~

After that I've got the amount of photos by city:

~~~python
photos_by_city = photos \
    .groupby(by='city') \
    .agg({'name': 'count'}) \
    .rename(columns={'name': 'photos'}) \
    .reset_index()
~~~
~~~python
>>> photos_by_city
             city  photos
0  Buenos-Aires    193
1  Cancun          292
2  Lima            295
3  Mexico City     256
4  Rio De Janeiro  422
5  Santiago        267
>>> photos_by_city.plot(x='city', y='photos', kind="bar",
                        title='Photos by city', legend=False)
~~~
![Cities](/assets/sa_after/photos_by_city.png)

Let's go a bit deeper and use image recognition, to not reinvent the wheel I've used
[a slightly modified version of TensorFlow imagenet tutorial example](https://gist.github.com/nvbn/1a8fb134917e906527cc1a178e004c70#file-classify_image-py) and for
each photo find what's on it:

~~~python
classify_image.init()
tags = tagged_photos.name\
    .apply(lambda name: classify_image.run_inference_on_image(name, 1)[0]) \
    .apply(pd.Series)

tagged_photos = photos.copy()
tagged_photos[['tag', 'score']] = tags.apply(pd.Series)
tagged_photos['tag'] = tagged_photos.tag.apply(lambda tag: tag.split(', ')[0])
~~~
~~~python
>>> tagged_photos.head()
                          name          created_at  key            city           spent             arrived                left       tag     score
1   photos/20180913_183207.jpg 2018-09-13 18:32:07  0    Buenos-Aires   3 days 18:00:09 2018-09-12 23:29:52 2018-09-16 17:30:01  cinema    0.164415
6   photos/20180909_141137.jpg 2018-09-09 14:11:36  0    Rio De Janeiro 4 days 11:55:38 2018-09-08 11:34:14 2018-09-12 23:29:52  pedestal  0.667128
14  photos/20180917_162240.jpg 2018-09-17 16:22:40  0    Santiago       2 days 23:24:12 2018-09-16 17:30:01 2018-09-19 16:54:13  cinema    0.225404
22  photos/20180923_161707.jpg 2018-09-23 16:17:07  0    Mexico City    2 days 22:45:22 2018-09-22 20:43:42 2018-09-25 19:29:04  obelisk   0.775244
26  photos/20180917_111251.jpg 2018-09-17 11:12:51  0    Santiago       2 days 23:24:12 2018-09-16 17:30:01 2018-09-19 16:54:13  seashore  0.24720
~~~

So now it's possible to find things that I've taken photos of the most:

~~~python
photos_by_tag = tagged_photos \
    .groupby(by='tag') \
    .agg({'name': 'count'}) \
    .rename(columns={'name': 'photos'}) \
    .reset_index() \
    .sort_values('photos', ascending=False) \
    .head(10)
~~~
~~~python
>>> photos_by_tag
            tag  photos
107  seashore    276   
76   monastery   142   
64   lakeside    116   
86   palace      115   
3    alp         86    
81   obelisk     72    
101  promontory  50    
105  sandbar     49    
17   bell cote   43    
39   cliff       42
>>> photos_by_tag.plot(x='tag', y='photos', kind='bar',
                       legend=False, title='Popular tags')
~~~

![Popular tags](/assets/sa_after/popular_tags.png)

Then I was able to find what I was taking photos of by city:

~~~python
popular_tags = photos_by_tag.head(5).tag
popular_tagged = tagged_photos[tagged_photos.tag.isin(popular_tags)]
not_popular_tagged = tagged_photos[~tagged_photos.tag.isin(popular_tags)].assign(
    tag='other')
by_tag_city = popular_tagged \
    .append(not_popular_tagged) \
    .groupby(by=['city', 'tag']) \
    .count()['name'] \
    .unstack(fill_value=0)
~~~
~~~python
>>> by_tag_city
tag             alp  lakeside  monastery  other  palace  seashore
city                                                             
Buenos-Aires    5    1         24         123    30      10      
Cancun          0    19        6          153    4       110     
Lima            0    25        42         136    38      54      
Mexico City     7    9         26         197    5       12      
Rio De Janeiro  73   45        17         212    4       71      
Santiago        1    17        27         169    34      19     
>>> by_tag_city.plot(kind='bar', stacked=True)
~~~
![Tags by city](/assets/sa_after/tags_by_city.png)

Although the most common thing on this plot is "other", it's still fun.

[Gist with full sources](https://gist.github.com/nvbn/1a8fb134917e906527cc1a178e004c70).
