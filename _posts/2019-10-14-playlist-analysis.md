---
layout: post
title: "Analysing music habits with Spotify API and Python"
date: 2019-10-14 23:55
keywords: python, spotify, pandas
image: /assets/spotify/hero.jpg
---

![Hero image](/assets/spotify/hero.jpg)

I'm using Spotify since 2013 as the main source of music, and back at that time the app
automatically created a playlist for songs that I liked from artists' radios.
By innertion I'm still using the playlist to save songs that I like. As the playlist
became a bit big and a bit old (6 years, huh), I've decided to try to analyze it.

#### Boring preparation

To get the data I used [Spotify API](https://developer.spotify.com/documentation/web-api/)
and [spotipy](https://github.com/plamere/spotipy) as a Python client. I've created an application in
the [Spotify Dashboard](https://developer.spotify.com/dashboard/applications) and
gathered the credentials. Then I was able to initialize and authorize the client:

~~~python
import spotipy
import spotipy.util as util

token = util.prompt_for_user_token(user_id,
                                   'playlist-read-collaborative',
                                   client_id=client_id,
                                   client_secret=client_secret,
                                   redirect_uri='http://localhost:8000/')
sp = spotipy.Spotify(auth=token)
~~~

#### Tracks metadata 

As everything is inside just one playlist, it was easy to gather. The only problem was
that `user_playlist` method in spotipy doesn't support pagination and can only return the
first 100 track, but it was easily solved by just going down to private and undocumented
`_get`:

~~~python
playlist = sp.user_playlist(user_id, playlist_id)
tracks = playlist['tracks']['items']
next_uri = playlist['tracks']['next']
for _ in range(int(playlist['tracks']['total'] / playlist['tracks']['limit'])):
    response = sp._get(next_uri)
    tracks += response['items']
    next_uri = response['next']

tracks_df = pd.DataFrame([(track['track']['id'],
                           track['track']['artists'][0]['name'],
                           track['track']['name'],
                           parse_date(track['track']['album']['release_date']) if track['track']['album']['release_date'] else None,
                           parse_date(track['added_at']))
                          for track in playlist['tracks']['items']],
                         columns=['id', 'artist', 'name', 'release_date', 'added_at'] )
~~~
~~~python
tracks_df.head(10)
~~~
<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>id</th>
      <th>artist</th>
      <th>name</th>
      <th>release_date</th>
      <th>added_at</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>1MLtdVIDLdupSO1PzNNIQg</td>
      <td>Lindstrøm &amp; Christabelle</td>
      <td>Looking For What</td>
      <td>2009-12-11</td>
      <td>2013-06-19 08:28:56+00:00</td>
    </tr>
    <tr>
      <td>1</td>
      <td>1gWsh0T1gi55K45TMGZxT0</td>
      <td>Au Revoir Simone</td>
      <td>Knight Of Wands - Dam Mantle Remix</td>
      <td>2010-07-04</td>
      <td>2013-06-19 08:48:30+00:00</td>
    </tr>
    <tr>
      <td>2</td>
      <td>0LE3YWM0W9OWputCB8Z3qt</td>
      <td>Fever Ray</td>
      <td>When I Grow Up - D. Lissvik Version</td>
      <td>2010-10-02</td>
      <td>2013-06-19 22:09:15+00:00</td>
    </tr>
    <tr>
      <td>3</td>
      <td>5FyiyLzbZt41IpWyMuiiQy</td>
      <td>Holy Ghost!</td>
      <td>Dumb Disco Ideas</td>
      <td>2013-05-14</td>
      <td>2013-06-19 22:12:42+00:00</td>
    </tr>
    <tr>
      <td>4</td>
      <td>5cgfva649kw89xznFpWCFd</td>
      <td>Nouvelle Vague</td>
      <td>Too Drunk To Fuck</td>
      <td>2004-11-01</td>
      <td>2013-06-19 22:22:54+00:00</td>
    </tr>
    <tr>
      <td>5</td>
      <td>3IVc3QK63DngBdW7eVker2</td>
      <td>TR/ST</td>
      <td>F.T.F.</td>
      <td>2012-11-16</td>
      <td>2013-06-20 11:50:58+00:00</td>
    </tr>
    <tr>
      <td>6</td>
      <td>0mbpEDdZHNMEDll6woEy8W</td>
      <td>Art Brut</td>
      <td>My Little Brother</td>
      <td>2005-10-02</td>
      <td>2013-06-20 13:58:19+00:00</td>
    </tr>
    <tr>
      <td>7</td>
      <td>2y8IhUDSpvsuuEePNLjGg5</td>
      <td>Niki &amp; The Dove</td>
      <td>Somebody (drum machine version)</td>
      <td>2011-06-14</td>
      <td>2013-06-21 09:28:40+00:00</td>
    </tr>
    <tr>
      <td>8</td>
      <td>1X4RqFAShNL8aHfUIpjIVr</td>
      <td>Gorillaz</td>
      <td>Kids with Guns - Hot Chip Remix</td>
      <td>2007-11-19</td>
      <td>2013-06-23 19:00:57+00:00</td>
    </tr>
    <tr>
      <td>9</td>
      <td>1cV4DVeAM5AstrDlXgvzJ7</td>
      <td>Lykke Li</td>
      <td>I'm Good, I'm Gone</td>
      <td>2008-01-28</td>
      <td>2013-06-23 22:31:52+00:00</td>
    </tr>
  </tbody>
</table>
</div>

The first naive idea of data to get was the list of the most appearing artists:

~~~python
tracks_df \
    .groupby('artist') \
    .count()['id'] \
    .reset_index() \
    .sort_values('id', ascending=False) \
    .rename(columns={'id': 'amount'}) \
    .head(10)
~~~
<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>artist</th>
      <th>amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>260</td>
      <td>Pet Shop Boys</td>
      <td>12</td>
    </tr>
    <tr>
      <td>334</td>
      <td>The Knife</td>
      <td>11</td>
    </tr>
    <tr>
      <td>213</td>
      <td>Metronomy</td>
      <td>9</td>
    </tr>
    <tr>
      <td>303</td>
      <td>Soulwax</td>
      <td>8</td>
    </tr>
    <tr>
      <td>284</td>
      <td>Röyksopp</td>
      <td>7</td>
    </tr>
    <tr>
      <td>180</td>
      <td>Ladytron</td>
      <td>7</td>
    </tr>
    <tr>
      <td>94</td>
      <td>Depeche Mode</td>
      <td>7</td>
    </tr>
    <tr>
      <td>113</td>
      <td>Fever Ray</td>
      <td>6</td>
    </tr>
    <tr>
      <td>324</td>
      <td>The Chemical Brothers</td>
      <td>6</td>
    </tr>
    <tr>
      <td>233</td>
      <td>New Order</td>
      <td>6</td>
    </tr>
  </tbody>
</table>
</div>

But as taste can change, I've decided to get top five artists from each year and
check if I was adding them to the playlist in other years:

~~~python
counted_year_df = tracks_df \
    .assign(year_added=tracks_df.added_at.dt.year) \
    .groupby(['artist', 'year_added']) \
    .count()['id'] \
    .reset_index() \
    .rename(columns={'id': 'amount'}) \
    .sort_values('amount', ascending=False)

in_top_5_year_artist = counted_year_df \
    .groupby('year_added') \
    .head(5) \
    .artist \
    .unique()

counted_year_df \
    [counted_year_df.artist.isin(in_top_5_year_artist)] \
    .pivot('artist', 'year_added', 'amount') \
    .fillna(0) \
    .style.background_gradient()
~~~

<style type="text/css">
    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col0 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col3 {
        background-color:  #e3e0ee;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col4 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row0_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col3 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row1_col6 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col2 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col3 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row2_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col2 {
        background-color:  #056faf;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col3 {
        background-color:  #e3e0ee;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col5 {
        background-color:  #2685bb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row3_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col1 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col5 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row4_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col0 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col1 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row5_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col0 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row6_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col0 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col1 {
        background-color:  #f2ecf5;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col2 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col4 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row7_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col2 {
        background-color:  #056faf;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col3 {
        background-color:  #e3e0ee;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row8_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col4 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col5 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row9_col6 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col4 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col5 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row10_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col2 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row11_col6 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row12_col6 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col2 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col4 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row13_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col0 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col1 {
        background-color:  #f2ecf5;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col5 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row14_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row15_col6 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row16_col6 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col1 {
        background-color:  #f2ecf5;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col3 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col5 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row17_col6 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col1 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col4 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row18_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col3 {
        background-color:  #e3e0ee;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col5 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row19_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col0 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col1 {
        background-color:  #96b6d7;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row20_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col1 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row21_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col1 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col3 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row22_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col4 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row23_col6 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col4 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col5 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row24_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col2 {
        background-color:  #056faf;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row25_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col2 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col4 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row26_col6 {
        background-color:  #056faf;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col5 {
        background-color:  #2685bb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row27_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col0 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col1 {
        background-color:  #f2ecf5;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col2 {
        background-color:  #056faf;
        color:  #f1f1f1;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col3 {
        background-color:  #e3e0ee;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row28_col6 {
        background-color:  #d0d1e6;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col3 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row29_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col5 {
        background-color:  #2685bb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row30_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col4 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col5 {
        background-color:  #2685bb;
        color:  #000000;
    }    #T_86ce1a46_e565_11e9_86bb_acde48001122row31_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }</style>

<table style='overflow-x: scroll; font-size: 1rem' id="T_86ce1a46_e565_11e9_86bb_acde48001122"><thead>    <tr>        <th class="index_name level0">year_added</th>        <th class="col_heading level0 col0">2013</th>        <th class="col_heading level0 col1">2014</th>        <th class="col_heading level0 col2">2015</th>        <th class="col_heading level0 col3">2016</th>        <th class="col_heading level0 col4">2017</th>        <th class="col_heading level0 col5">2018</th>        <th class="col_heading level0 col6">2019</th>    </tr>    <tr>        <th class="index_name level0">artist</th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>    </tr></thead><tbody>
        <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row0" class="row_heading level0 row0">Arcade Fire</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col0" class="data row0 col0">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col1" class="data row0 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col2" class="data row0 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col3" class="data row0 col3">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col4" class="data row0 col4">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col5" class="data row0 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row0_col6" class="data row0 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row1" class="row_heading level0 row1">Clinic</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col0" class="data row1 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col1" class="data row1 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col2" class="data row1 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col3" class="data row1 col3">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col4" class="data row1 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col5" class="data row1 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row1_col6" class="data row1 col6">1</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row2" class="row_heading level0 row2">Crystal Castles</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col0" class="data row2 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col1" class="data row2 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col2" class="data row2 col2">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col3" class="data row2 col3">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col4" class="data row2 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col5" class="data row2 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row2_col6" class="data row2 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row3" class="row_heading level0 row3">Depeche Mode</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col0" class="data row3 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col1" class="data row3 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col2" class="data row3 col2">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col3" class="data row3 col3">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col4" class="data row3 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col5" class="data row3 col5">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row3_col6" class="data row3 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row4" class="row_heading level0 row4">Die Antwoord</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col0" class="data row4 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col1" class="data row4 col1">4</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col2" class="data row4 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col3" class="data row4 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col4" class="data row4 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col5" class="data row4 col5">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row4_col6" class="data row4 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row5" class="row_heading level0 row5">FM Belfast</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col0" class="data row5 col0">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col1" class="data row5 col1">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col2" class="data row5 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col3" class="data row5 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col4" class="data row5 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col5" class="data row5 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row5_col6" class="data row5 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row6" class="row_heading level0 row6">Factory Floor</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col0" class="data row6 col0">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col1" class="data row6 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col2" class="data row6 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col3" class="data row6 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col4" class="data row6 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col5" class="data row6 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row6_col6" class="data row6 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row7" class="row_heading level0 row7">Fever Ray</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col0" class="data row7 col0">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col1" class="data row7 col1">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col2" class="data row7 col2">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col3" class="data row7 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col4" class="data row7 col4">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col5" class="data row7 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row7_col6" class="data row7 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row8" class="row_heading level0 row8">Grimes</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col0" class="data row8 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col1" class="data row8 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col2" class="data row8 col2">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col3" class="data row8 col3">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col4" class="data row8 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col5" class="data row8 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row8_col6" class="data row8 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row9" class="row_heading level0 row9">Holy Ghost!</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col0" class="data row9 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col1" class="data row9 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col2" class="data row9 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col3" class="data row9 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col4" class="data row9 col4">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col5" class="data row9 col5">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row9_col6" class="data row9 col6">1</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row10" class="row_heading level0 row10">Joe Goddard</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col0" class="data row10 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col1" class="data row10 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col2" class="data row10 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col3" class="data row10 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col4" class="data row10 col4">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col5" class="data row10 col5">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row10_col6" class="data row10 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row11" class="row_heading level0 row11">John Maus</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col0" class="data row11 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col1" class="data row11 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col2" class="data row11 col2">4</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col3" class="data row11 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col4" class="data row11 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col5" class="data row11 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row11_col6" class="data row11 col6">1</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row12" class="row_heading level0 row12">KOMPROMAT</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col0" class="data row12 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col1" class="data row12 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col2" class="data row12 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col3" class="data row12 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col4" class="data row12 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col5" class="data row12 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row12_col6" class="data row12 col6">2</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row13" class="row_heading level0 row13">LCD Soundsystem</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col0" class="data row13 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col1" class="data row13 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col2" class="data row13 col2">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col3" class="data row13 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col4" class="data row13 col4">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col5" class="data row13 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row13_col6" class="data row13 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row14" class="row_heading level0 row14">Ladytron</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col0" class="data row14 col0">5</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col1" class="data row14 col1">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col2" class="data row14 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col3" class="data row14 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col4" class="data row14 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col5" class="data row14 col5">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row14_col6" class="data row14 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row15" class="row_heading level0 row15">Lindstrøm</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col0" class="data row15 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col1" class="data row15 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col2" class="data row15 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col3" class="data row15 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col4" class="data row15 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col5" class="data row15 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row15_col6" class="data row15 col6">2</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row16" class="row_heading level0 row16">Marie Davidson</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col0" class="data row16 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col1" class="data row16 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col2" class="data row16 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col3" class="data row16 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col4" class="data row16 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col5" class="data row16 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row16_col6" class="data row16 col6">2</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row17" class="row_heading level0 row17">Metronomy</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col0" class="data row17 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col1" class="data row17 col1">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col2" class="data row17 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col3" class="data row17 col3">6</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col4" class="data row17 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col5" class="data row17 col5">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row17_col6" class="data row17 col6">1</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row18" class="row_heading level0 row18">Midnight Magic</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col0" class="data row18 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col1" class="data row18 col1">4</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col2" class="data row18 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col3" class="data row18 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col4" class="data row18 col4">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col5" class="data row18 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row18_col6" class="data row18 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row19" class="row_heading level0 row19">Mr. Oizo</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col0" class="data row19 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col1" class="data row19 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col2" class="data row19 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col3" class="data row19 col3">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col4" class="data row19 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col5" class="data row19 col5">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row19_col6" class="data row19 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row20" class="row_heading level0 row20">New Order</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col0" class="data row20 col0">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col1" class="data row20 col1">5</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col2" class="data row20 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col3" class="data row20 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col4" class="data row20 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col5" class="data row20 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row20_col6" class="data row20 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row21" class="row_heading level0 row21">Pet Shop Boys</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col0" class="data row21 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col1" class="data row21 col1">12</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col2" class="data row21 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col3" class="data row21 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col4" class="data row21 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col5" class="data row21 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row21_col6" class="data row21 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row22" class="row_heading level0 row22">Röyksopp</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col0" class="data row22 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col1" class="data row22 col1">4</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col2" class="data row22 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col3" class="data row22 col3">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col4" class="data row22 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col5" class="data row22 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row22_col6" class="data row22 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row23" class="row_heading level0 row23">Schwefelgelb</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col0" class="data row23 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col1" class="data row23 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col2" class="data row23 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col3" class="data row23 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col4" class="data row23 col4">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col5" class="data row23 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row23_col6" class="data row23 col6">4</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row24" class="row_heading level0 row24">Soulwax</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col0" class="data row24 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col1" class="data row24 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col2" class="data row24 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col3" class="data row24 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col4" class="data row24 col4">5</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col5" class="data row24 col5">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row24_col6" class="data row24 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row25" class="row_heading level0 row25">Talking Heads</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col0" class="data row25 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col1" class="data row25 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col2" class="data row25 col2">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col3" class="data row25 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col4" class="data row25 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col5" class="data row25 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row25_col6" class="data row25 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row26" class="row_heading level0 row26">The Chemical Brothers</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col0" class="data row26 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col1" class="data row26 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col2" class="data row26 col2">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col3" class="data row26 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col4" class="data row26 col4">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col5" class="data row26 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row26_col6" class="data row26 col6">3</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row27" class="row_heading level0 row27">The Fall</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col0" class="data row27 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col1" class="data row27 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col2" class="data row27 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col3" class="data row27 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col4" class="data row27 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col5" class="data row27 col5">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row27_col6" class="data row27 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row28" class="row_heading level0 row28">The Knife</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col0" class="data row28 col0">5</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col1" class="data row28 col1">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col2" class="data row28 col2">3</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col3" class="data row28 col3">1</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col4" class="data row28 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col5" class="data row28 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row28_col6" class="data row28 col6">1</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row29" class="row_heading level0 row29">The Normal</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col0" class="data row29 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col1" class="data row29 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col2" class="data row29 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col3" class="data row29 col3">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col4" class="data row29 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col5" class="data row29 col5">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row29_col6" class="data row29 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row30" class="row_heading level0 row30">The Prodigy</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col0" class="data row30 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col1" class="data row30 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col2" class="data row30 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col3" class="data row30 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col4" class="data row30 col4">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col5" class="data row30 col5">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row30_col6" class="data row30 col6">0</td>
    </tr>
    <tr>
                <th id="T_86ce1a46_e565_11e9_86bb_acde48001122level0_row31" class="row_heading level0 row31">Vitalic</th>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col0" class="data row31 col0">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col1" class="data row31 col1">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col2" class="data row31 col2">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col3" class="data row31 col3">0</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col4" class="data row31 col4">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col5" class="data row31 col5">2</td>
                <td id="T_86ce1a46_e565_11e9_86bb_acde48001122row31_col6" class="data row31 col6">0</td>
    </tr>
</tbody></table>

As a bunch of artists was reappearing in different years, I decided to check if
that correlates with new releases, so I've checked the last ten years:

~~~python
counted_release_year_df = tracks_df \
    .assign(year_added=tracks_df.added_at.dt.year,
            year_released=tracks_df.release_date.dt.year) \
    .groupby(['year_released', 'year_added']) \
    .count()['id'] \
    .reset_index() \
    .rename(columns={'id': 'amount'}) \
    .sort_values('amount', ascending=False)

counted_release_year_df \
    [counted_release_year_df.year_released.isin(
        sorted(tracks_df.release_date.dt.year.unique())[-11:]
    )] \
    .pivot('year_released', 'year_added', 'amount') \
    .fillna(0) \
    .style.background_gradient()
~~~

<style type="text/css">
    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col0 {
        background-color:  #2182b9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col1 {
        background-color:  #cacee5;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col2 {
        background-color:  #eae6f1;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col3 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col4 {
        background-color:  #cdd0e5;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col5 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col6 {
        background-color:  #1379b5;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col0 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col1 {
        background-color:  #b4c4df;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col2 {
        background-color:  #cacee5;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col3 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col4 {
        background-color:  #d8d7e9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col5 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col6 {
        background-color:  #acc0dd;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col0 {
        background-color:  #9fbad9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col1 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col2 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col3 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col4 {
        background-color:  #afc1dd;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col5 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col6 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col0 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col1 {
        background-color:  #529bc7;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col2 {
        background-color:  #dbdaeb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col3 {
        background-color:  #4295c3;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col4 {
        background-color:  #d8d7e9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col5 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col6 {
        background-color:  #e8e4f0;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col1 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col2 {
        background-color:  #eae6f1;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col3 {
        background-color:  #f0eaf4;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col5 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col6 {
        background-color:  #f4eef6;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col2 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col3 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col4 {
        background-color:  #afc1dd;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col5 {
        background-color:  #187cb6;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col6 {
        background-color:  #2f8bbe;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col3 {
        background-color:  #0567a2;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col4 {
        background-color:  #bfc9e1;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col5 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col6 {
        background-color:  #acc0dd;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col4 {
        background-color:  #023858;
        color:  #f1f1f1;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col5 {
        background-color:  #73a9cf;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col6 {
        background-color:  #acc0dd;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col5 {
        background-color:  #9cb9d9;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col6 {
        background-color:  #509ac6;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col0 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col1 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col2 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col3 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col4 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col5 {
        background-color:  #fff7fb;
        color:  #000000;
    }    #T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col6 {
        background-color:  #023858;
        color:  #f1f1f1;
    }</style>

<table style='overflow-x: scroll; font-size: 1rem'  id="T_e6282bbc_e62d_11e9_86bb_acde48001122"><thead>    <tr>        <th class="index_name level0">year_added</th>        <th class="col_heading level0 col0">2013</th>        <th class="col_heading level0 col1">2014</th>        <th class="col_heading level0 col2">2015</th>        <th class="col_heading level0 col3">2016</th>        <th class="col_heading level0 col4">2017</th>        <th class="col_heading level0 col5">2018</th>        <th class="col_heading level0 col6">2019</th>    </tr>    <tr>        <th class="index_name level0">year_released</th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>        <th class="blank"></th>    </tr></thead><tbody>
            <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row0" class="row_heading level0 row0">2010.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col0" class="data row0 col0">19</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col1" class="data row0 col1">8</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col2" class="data row0 col2">2</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col3" class="data row0 col3">10</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col4" class="data row0 col4">6</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col5" class="data row0 col5">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row0_col6" class="data row0 col6">10</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row1" class="row_heading level0 row1">2011.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col0" class="data row1 col0">14</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col1" class="data row1 col1">10</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col2" class="data row1 col2">4</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col3" class="data row1 col3">6</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col4" class="data row1 col4">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col5" class="data row1 col5">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row1_col6" class="data row1 col6">5</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row2" class="row_heading level0 row2">2012.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col0" class="data row2 col0">11</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col1" class="data row2 col1">15</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col2" class="data row2 col2">6</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col3" class="data row2 col3">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col4" class="data row2 col4">8</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col5" class="data row2 col5">2</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row2_col6" class="data row2 col6">0</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row3" class="row_heading level0 row3">2013.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col0" class="data row3 col0">28</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col1" class="data row3 col1">17</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col2" class="data row3 col2">3</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col3" class="data row3 col3">6</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col4" class="data row3 col4">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col5" class="data row3 col5">4</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row3_col6" class="data row3 col6">2</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row4" class="row_heading level0 row4">2014.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col0" class="data row4 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col1" class="data row4 col1">30</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col2" class="data row4 col2">2</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col3" class="data row4 col3">1</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col4" class="data row4 col4">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col5" class="data row4 col5">10</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row4_col6" class="data row4 col6">1</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row5" class="row_heading level0 row5">2015.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col0" class="data row5 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col1" class="data row5 col1">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col2" class="data row5 col2">15</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col3" class="data row5 col3">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col4" class="data row5 col4">8</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col5" class="data row5 col5">7</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row5_col6" class="data row5 col6">9</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row6" class="row_heading level0 row6">2016.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col0" class="data row6 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col1" class="data row6 col1">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col2" class="data row6 col2">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col3" class="data row6 col3">8</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col4" class="data row6 col4">7</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col5" class="data row6 col5">4</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row6_col6" class="data row6 col6">5</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row7" class="row_heading level0 row7">2017.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col0" class="data row7 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col1" class="data row7 col1">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col2" class="data row7 col2">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col3" class="data row7 col3">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col4" class="data row7 col4">23</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col5" class="data row7 col5">5</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row7_col6" class="data row7 col6">5</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row8" class="row_heading level0 row8">2018.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col0" class="data row8 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col1" class="data row8 col1">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col2" class="data row8 col2">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col3" class="data row8 col3">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col4" class="data row8 col4">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col5" class="data row8 col5">4</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row8_col6" class="data row8 col6">8</td>
        </tr>
        <tr>
                    <th id="T_e6282bbc_e62d_11e9_86bb_acde48001122level0_row9" class="row_heading level0 row9">2019.0</th>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col0" class="data row9 col0">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col1" class="data row9 col1">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col2" class="data row9 col2">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col3" class="data row9 col3">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col4" class="data row9 col4">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col5" class="data row9 col5">0</td>
                    <td id="T_e6282bbc_e62d_11e9_86bb_acde48001122row9_col6" class="data row9 col6">14</td>
        </tr>
</tbody></table>

#### Audio features

Spotify API has [an endpoint](https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/)
that provides features like danceability, energy, loudness and etc for tracks. So I gathered
features for all tracks from the playlist:

~~~python
features = []
for n, chunk_series in tracks_df.groupby(np.arange(len(tracks_df)) // 50).id:
    features += sp.audio_features([*map(str, chunk_series)])
features_df = pd.DataFrame.from_dict(filter(None, features))
tracks_with_features_df = tracks_df.merge(features_df, on=['id'], how='inner')
~~~
~~~python
tracks_with_features_df.head()
~~~
<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>id</th>
      <th>artist</th>
      <th>name</th>
      <th>release_date</th>
      <th>added_at</th>
      <th>danceability</th>
      <th>energy</th>
      <th>key</th>
      <th>loudness</th>
      <th>mode</th>
      <th>speechiness</th>
      <th>acousticness</th>
      <th>instrumentalness</th>
      <th>liveness</th>
      <th>valence</th>
      <th>tempo</th>
      <th>duration_ms</th>
      <th>time_signature</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>1MLtdVIDLdupSO1PzNNIQg</td>
      <td>Lindstrøm &amp; Christabelle</td>
      <td>Looking For What</td>
      <td>2009-12-11</td>
      <td>2013-06-19 08:28:56+00:00</td>
      <td>0.566</td>
      <td>0.726</td>
      <td>0</td>
      <td>-11.294</td>
      <td>1</td>
      <td>0.1120</td>
      <td>0.04190</td>
      <td>0.494000</td>
      <td>0.282</td>
      <td>0.345</td>
      <td>120.055</td>
      <td>359091</td>
      <td>4</td>
    </tr>
    <tr>
      <td>1</td>
      <td>1gWsh0T1gi55K45TMGZxT0</td>
      <td>Au Revoir Simone</td>
      <td>Knight Of Wands - Dam Mantle Remix</td>
      <td>2010-07-04</td>
      <td>2013-06-19 08:48:30+00:00</td>
      <td>0.563</td>
      <td>0.588</td>
      <td>4</td>
      <td>-7.205</td>
      <td>0</td>
      <td>0.0637</td>
      <td>0.00573</td>
      <td>0.932000</td>
      <td>0.104</td>
      <td>0.467</td>
      <td>89.445</td>
      <td>237387</td>
      <td>4</td>
    </tr>
    <tr>
      <td>2</td>
      <td>0LE3YWM0W9OWputCB8Z3qt</td>
      <td>Fever Ray</td>
      <td>When I Grow Up - D. Lissvik Version</td>
      <td>2010-10-02</td>
      <td>2013-06-19 22:09:15+00:00</td>
      <td>0.687</td>
      <td>0.760</td>
      <td>5</td>
      <td>-6.236</td>
      <td>1</td>
      <td>0.0479</td>
      <td>0.01160</td>
      <td>0.007680</td>
      <td>0.417</td>
      <td>0.818</td>
      <td>92.007</td>
      <td>270120</td>
      <td>4</td>
    </tr>
    <tr>
      <td>3</td>
      <td>5FyiyLzbZt41IpWyMuiiQy</td>
      <td>Holy Ghost!</td>
      <td>Dumb Disco Ideas</td>
      <td>2013-05-14</td>
      <td>2013-06-19 22:12:42+00:00</td>
      <td>0.752</td>
      <td>0.831</td>
      <td>10</td>
      <td>-4.407</td>
      <td>1</td>
      <td>0.0401</td>
      <td>0.00327</td>
      <td>0.729000</td>
      <td>0.105</td>
      <td>0.845</td>
      <td>124.234</td>
      <td>483707</td>
      <td>4</td>
    </tr>
    <tr>
      <td>4</td>
      <td>5cgfva649kw89xznFpWCFd</td>
      <td>Nouvelle Vague</td>
      <td>Too Drunk To Fuck</td>
      <td>2004-11-01</td>
      <td>2013-06-19 22:22:54+00:00</td>
      <td>0.461</td>
      <td>0.786</td>
      <td>7</td>
      <td>-6.950</td>
      <td>1</td>
      <td>0.0467</td>
      <td>0.47600</td>
      <td>0.000003</td>
      <td>0.495</td>
      <td>0.808</td>
      <td>159.882</td>
      <td>136160</td>
      <td>4</td>
    </tr>
  </tbody>
</table>
</div>

After that I've checked changes in features over time, only
instrumentalness had some visible difference:

~~~python
sns.boxplot(x=tracks_with_features_df.added_at.dt.year,
            y=tracks_with_features_df.instrumentalness)
~~~
![Instrumentalness over time](/assets/spotify/instrumentalness.png)

Then I had an idea to check seasonality and valence, and it kind of showed
that in depressing months valence is a bit lower:

~~~python
sns.boxplot(x=tracks_with_features_df.added_at.dt.month,
            y=tracks_with_features_df.valence)
~~~

![Valence seasonality](/assets/spotify/valence.png)

To play a bit more with data, I decided to check that danceability
and valence might correlate:

~~~python
tracks_with_features_df.plot(kind='scatter', x='danceability', y='valence')
~~~

![Dnaceability vs valence](/assets/spotify/danceability_valence.png)

And to check that the data is meaningful, I checked instrumentalness vs
speechiness, and those featues looked mutually exclusive as expected:

~~~python
tracks_with_features_df.plot(kind='scatter', x='instrumentalness', y='speechiness')
~~~

![Speachness vs instrumentalness](/assets/spotify/speachness_instrumentalness.png)

#### Tracks difference and similarity

As I already had a bunch of features classifying tracks, it was hard not to make vectors out of them:

~~~python
encode_fields = [
    'danceability',
    'energy',
    'key',
    'loudness',
    'mode',
    'speechiness',
    'acousticness',
    'instrumentalness',
    'liveness',
    'valence',
    'tempo',
    'duration_ms',
    'time_signature',
]

def encode(row):
    return np.array([
        (row[k] - tracks_with_features_df[k].min())
        / (tracks_with_features_df[k].max() - tracks_with_features_df[k].min())
        for k in encode_fields])

tracks_with_features_encoded_df = tracks_with_features_df.assign(
    encoded=tracks_with_features_df.apply(encode, axis=1))
~~~

Then I just calculated distance between every two tracks:

~~~python
tracks_with_features_encoded_product_df = tracks_with_features_encoded_df \
    .assign(temp=0) \
    .merge(tracks_with_features_encoded_df.assign(temp=0), on='temp', how='left') \
    .drop(columns='temp')
tracks_with_features_encoded_product_df = tracks_with_features_encoded_product_df[
    tracks_with_features_encoded_product_df.id_x != tracks_with_features_encoded_product_df.id_y
]
tracks_with_features_encoded_product_df['merge_id'] = tracks_with_features_encoded_product_df \
    .apply(lambda row: ''.join(sorted([row['id_x'], row['id_y']])), axis=1)
tracks_with_features_encoded_product_df['distance'] = tracks_with_features_encoded_product_df \
    .apply(lambda row: np.linalg.norm(row['encoded_x'] - row['encoded_y']), axis=1)
~~~

After that I was able to get most similar songs/songs with the minimal distance, and
it selected kind of similar songs:

~~~python
tracks_with_features_encoded_product_df \
    .sort_values('distance') \
    .drop_duplicates('merge_id') \
    [['artist_x', 'name_x', 'release_date_x', 'artist_y', 'name_y', 'release_date_y', 'distance']] \
    .head(10)
~~~

<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>artist_x</th>
      <th>name_x</th>
      <th>release_date_x</th>
      <th>artist_y</th>
      <th>name_y</th>
      <th>release_date_y</th>
      <th>distance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>84370</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>0.000000</td>
    </tr>
    <tr>
      <td>446773</td>
      <td>YACHT</td>
      <td>I Thought the Future Would Be Cooler</td>
      <td>2015-09-11</td>
      <td>ADULT.</td>
      <td>Love Lies</td>
      <td>2013-05-13</td>
      <td>0.111393</td>
    </tr>
    <tr>
      <td>21963</td>
      <td>Ladytron</td>
      <td>Seventeen</td>
      <td>2011-03-29</td>
      <td>The Juan Maclean</td>
      <td>Give Me Every Little Thing</td>
      <td>2005-07-04</td>
      <td>0.125358</td>
    </tr>
    <tr>
      <td>11480</td>
      <td>Class Actress</td>
      <td>Careful What You Say</td>
      <td>2010-02-09</td>
      <td>MGMT</td>
      <td>Little Dark Age</td>
      <td>2017-10-17</td>
      <td>0.128865</td>
    </tr>
    <tr>
      <td>261780</td>
      <td>Queen of Japan</td>
      <td>I Was Made For Loving You</td>
      <td>2001-10-02</td>
      <td>Midnight Juggernauts</td>
      <td>Devil Within</td>
      <td>2007-10-02</td>
      <td>0.131304</td>
    </tr>
    <tr>
      <td>63257</td>
      <td>Pixies</td>
      <td>Bagboy</td>
      <td>2013-09-09</td>
      <td>Kindness</td>
      <td>That's Alright</td>
      <td>2012-03-16</td>
      <td>0.146897</td>
    </tr>
    <tr>
      <td>265792</td>
      <td>Datarock</td>
      <td>Computer Camp Love</td>
      <td>2005-10-02</td>
      <td>Chromeo</td>
      <td>Night By Night</td>
      <td>2010-09-21</td>
      <td>0.147235</td>
    </tr>
    <tr>
      <td>75359</td>
      <td>Midnight Juggernauts</td>
      <td>Devil Within</td>
      <td>2007-10-02</td>
      <td>Lykke Li</td>
      <td>I'm Good, I'm Gone</td>
      <td>2008-01-28</td>
      <td>0.152680</td>
    </tr>
    <tr>
      <td>105246</td>
      <td>ADULT.</td>
      <td>Love Lies</td>
      <td>2013-05-13</td>
      <td>Dr. Alban</td>
      <td>Sing Hallelujah!</td>
      <td>1992-05-04</td>
      <td>0.154475</td>
    </tr>
    <tr>
      <td>285180</td>
      <td>Gigamesh</td>
      <td>Don't Stop</td>
      <td>2012-05-28</td>
      <td>Pet Shop Boys</td>
      <td>Paninaro 95 - 2003 Remaster</td>
      <td>2003-10-02</td>
      <td>0.156469</td>
    </tr>
  </tbody>
</table>
</div>

The most different songs weren't that fun, as two songs were too different from the rest:

~~~python
tracks_with_features_encoded_product_df \
    .sort_values('distance', ascending=False) \
    .drop_duplicates('merge_id') \
    [['artist_x', 'name_x', 'release_date_x', 'artist_y', 'name_y', 'release_date_y', 'distance']] \
    .head(10)
~~~
<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>artist_x</th>
      <th>name_x</th>
      <th>release_date_x</th>
      <th>artist_y</th>
      <th>name_y</th>
      <th>release_date_y</th>
      <th>distance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>79324</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>Boy Harsher</td>
      <td>Modulations</td>
      <td>2014-10-01</td>
      <td>2.480206</td>
    </tr>
    <tr>
      <td>84804</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>Boy Harsher</td>
      <td>Modulations</td>
      <td>2014-10-01</td>
      <td>2.480206</td>
    </tr>
    <tr>
      <td>400840</td>
      <td>Charlotte Gainsbourg</td>
      <td>Deadly Valentine - Soulwax Remix</td>
      <td>2017-11-10</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>2.478183</td>
    </tr>
    <tr>
      <td>84840</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>Charlotte Gainsbourg</td>
      <td>Deadly Valentine - Soulwax Remix</td>
      <td>2017-11-10</td>
      <td>2.478183</td>
    </tr>
    <tr>
      <td>388510</td>
      <td>Ladytron</td>
      <td>Paco!</td>
      <td>2001-10-02</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>2.444927</td>
    </tr>
    <tr>
      <td>388518</td>
      <td>Ladytron</td>
      <td>Paco!</td>
      <td>2001-10-02</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>2.444927</td>
    </tr>
    <tr>
      <td>20665</td>
      <td>Factory Floor</td>
      <td>Fall Back</td>
      <td>2013-01-15</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>2.439136</td>
    </tr>
    <tr>
      <td>20673</td>
      <td>Factory Floor</td>
      <td>Fall Back</td>
      <td>2013-01-15</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>2.439136</td>
    </tr>
    <tr>
      <td>79448</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>La Femme</td>
      <td>Runway</td>
      <td>2018-10-01</td>
      <td>2.423574</td>
    </tr>
    <tr>
      <td>84928</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>La Femme</td>
      <td>Runway</td>
      <td>2018-10-01</td>
      <td>2.423574</td>
    </tr>
  </tbody>
</table>
</div>

Then I calculated the most avarage songs, eg the songs with the least distance from every other song:

~~~python
tracks_with_features_encoded_product_df \
    .groupby(['artist_x', 'name_x', 'release_date_x']) \
    .sum()['distance'] \
    .reset_index() \
    .sort_values('distance') \
    .head(10)
~~~
<div style='overflow-x: scroll'>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>artist_x</th>
      <th>name_x</th>
      <th>release_date_x</th>
      <th>distance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>48</td>
      <td>Beirut</td>
      <td>No Dice</td>
      <td>2009-02-17</td>
      <td>638.331257</td>
    </tr>
    <tr>
      <td>591</td>
      <td>The Juan McLean</td>
      <td>A Place Called Space</td>
      <td>2014-09-15</td>
      <td>643.436523</td>
    </tr>
    <tr>
      <td>347</td>
      <td>MGMT</td>
      <td>Little Dark Age</td>
      <td>2017-10-17</td>
      <td>645.959770</td>
    </tr>
    <tr>
      <td>101</td>
      <td>Class Actress</td>
      <td>Careful What You Say</td>
      <td>2010-02-09</td>
      <td>646.488998</td>
    </tr>
    <tr>
      <td>31</td>
      <td>Architecture In Helsinki</td>
      <td>2 Time</td>
      <td>2014-04-01</td>
      <td>648.692344</td>
    </tr>
    <tr>
      <td>588</td>
      <td>The Juan Maclean</td>
      <td>Give Me Every Little Thing</td>
      <td>2005-07-04</td>
      <td>648.878463</td>
    </tr>
    <tr>
      <td>323</td>
      <td>Lindstrøm</td>
      <td>Baby Can't Stop</td>
      <td>2009-10-26</td>
      <td>652.212858</td>
    </tr>
    <tr>
      <td>307</td>
      <td>Ladytron</td>
      <td>Seventeen</td>
      <td>2011-03-29</td>
      <td>652.759843</td>
    </tr>
    <tr>
      <td>310</td>
      <td>Lauer</td>
      <td>Mirrors (feat. Jasnau)</td>
      <td>2018-11-16</td>
      <td>655.498535</td>
    </tr>
    <tr>
      <td>451</td>
      <td>Pet Shop Boys</td>
      <td>Always on My Mind</td>
      <td>1998-03-31</td>
      <td>656.437048</td>
    </tr>
  </tbody>
</table>
</div>

And totally opposite thing &ndash; the most outstanding songs:

~~~python
tracks_with_features_encoded_product_df \
    .groupby(['artist_x', 'name_x', 'release_date_x']) \
    .sum()['distance'] \
    .reset_index() \
    .sort_values('distance', ascending=False) \
    .head(10)
~~~

<table style='overflow-x: scroll' border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>artist_x</th>
      <th>name_x</th>
      <th>release_date_x</th>
      <th>distance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>665</td>
      <td>YACHT</td>
      <td>Le Goudron - Long Version</td>
      <td>2012-05-25</td>
      <td>2823.572387</td>
    </tr>
    <tr>
      <td>300</td>
      <td>Labyrinth Ear</td>
      <td>Navy Light</td>
      <td>2010-11-21</td>
      <td>1329.234390</td>
    </tr>
    <tr>
      <td>301</td>
      <td>Labyrinth Ear</td>
      <td>Wild Flowers</td>
      <td>2010-11-21</td>
      <td>1329.234390</td>
    </tr>
    <tr>
      <td>57</td>
      <td>Blonde Redhead</td>
      <td>For the Damaged Coda</td>
      <td>2000-06-06</td>
      <td>1095.393120</td>
    </tr>
    <tr>
      <td>616</td>
      <td>The Velvet Underground</td>
      <td>After Hours</td>
      <td>1969-03-02</td>
      <td>1080.491779</td>
    </tr>
    <tr>
      <td>593</td>
      <td>The Knife</td>
      <td>Forest Families</td>
      <td>2006-02-17</td>
      <td>1040.114214</td>
    </tr>
    <tr>
      <td>615</td>
      <td>The Space Lady</td>
      <td>Major Tom</td>
      <td>2013-11-18</td>
      <td>1016.881467</td>
    </tr>
    <tr>
      <td>107</td>
      <td>CocoRosie</td>
      <td>By Your Side</td>
      <td>2004-03-09</td>
      <td>1015.970860</td>
    </tr>
    <tr>
      <td>170</td>
      <td>El Perro Del Mar</td>
      <td>Party</td>
      <td>2015-02-13</td>
      <td>1012.163212</td>
    </tr>
    <tr>
      <td>403</td>
      <td>Mr.Kitty</td>
      <td>XIII</td>
      <td>2014-10-06</td>
      <td>1010.115117</td>
    </tr>
  </tbody>
</table>

#### Conclusion

Although the dataset is a bit small, it was still fun to have a look at the data.

[Gist with a jupyter notebook](https://gist.github.com/nvbn/64eff11d332162b737e84200eb7f92ed)
with even more boring stuff, can be reused by modifying credentials.
