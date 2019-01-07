---
layout:     post
title:      "Extracting popular topics from subreddits"
date:       2019-01-07 22:50:00
keywords:   python, pandas, reddit, nltk, seaborn
image:      /assets/community_opinion_2/r_television_weekday.png
---

Continuing playing with Reddit data, I thought that it might be fun to extract
discussed topics from subreddits. **My idea was:** get comments from a
subreddit, extract ngrams, calculate counts of ngrams, normalize counts, and
subtract them from normalized counts of ngrams from a neutral set of comments.

### Small-scale

For proving the idea on a smaller scale, I've fetched titles, texts and
the first three levels of comments from top 1000 r/all posts ([full code available in a gist](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87)),
as it should have a lot of texts from different subreddits:

~~~python
get_subreddit_df('all').head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>id</th>
      <th>subreddit</th>
      <th>post_id</th>
      <th>kind</th>
      <th>text</th>
      <th>created</th>
      <th>score</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>7mjw12_title</td>
      <td>all</td>
      <td>7mjw12</td>
      <td>title</td>
      <td>My cab driver tonight was so excited to share ...</td>
      <td>1.514459e+09</td>
      <td>307861</td>
    </tr>
    <tr>
      <th>1</th>
      <td>7mjw12_selftext</td>
      <td>all</td>
      <td>7mjw12</td>
      <td>selftext</td>
      <td></td>
      <td>1.514459e+09</td>
      <td>307861</td>
    </tr>
    <tr>
      <th>2</th>
      <td>7mjw12_comment_druihai</td>
      <td>all</td>
      <td>7mjw12</td>
      <td>comment</td>
      <td>I want to make good humored inappropriate joke...</td>
      <td>1.514460e+09</td>
      <td>18336</td>
    </tr>
    <tr>
      <th>3</th>
      <td>7mjw12_comment_drulrp0</td>
      <td>all</td>
      <td>7mjw12</td>
      <td>comment</td>
      <td>Me too! It came out of nowhere- he was pretty ...</td>
      <td>1.514464e+09</td>
      <td>8853</td>
    </tr>
    <tr>
      <th>4</th>
      <td>7mjw12_comment_druluji</td>
      <td>all</td>
      <td>7mjw12</td>
      <td>comment</td>
      <td>Well, you got him to the top of Reddit, litera...</td>
      <td>1.514464e+09</td>
      <td>4749</td>
    </tr>
  </tbody>
</table>
</div>

Lemmatized texts, get all 1-3 words ngrams and counted them:

~~~python
df = get_tokens_df(subreddit)  # Full code is in gist
df.head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>token</th>
      <th>amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>cab</td>
      <td>84</td>
    </tr>
    <tr>
      <th>1</th>
      <td>driver</td>
      <td>1165</td>
    </tr>
    <tr>
      <th>2</th>
      <td>tonight</td>
      <td>360</td>
    </tr>
    <tr>
      <th>3</th>
      <td>excited</td>
      <td>245</td>
    </tr>
    <tr>
      <th>4</th>
      <td>share</td>
      <td>1793</td>
    </tr>
  </tbody>
</table>
</div>

Then I've normalized counts:

~~~python
df['amount_norm'] = (df.amount - df.amount.mean()) / (df.amount.max() - df.amount.min())
df.head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>token</th>
      <th>amount</th>
      <th>amount_norm</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>automate</td>
      <td>493</td>
      <td>0.043316</td>
    </tr>
    <tr>
      <th>1</th>
      <td>boring</td>
      <td>108</td>
      <td>0.009353</td>
    </tr>
    <tr>
      <th>2</th>
      <td>stuff</td>
      <td>1158</td>
      <td>0.101979</td>
    </tr>
    <tr>
      <th>3</th>
      <td>python</td>
      <td>11177</td>
      <td>0.985800</td>
    </tr>
    <tr>
      <th>4</th>
      <td>tinder</td>
      <td>29</td>
      <td>0.002384</td>
    </tr>
  </tbody>
</table>
</div>

And as the last step, I've calculated diff and got top 5 ngrams with texts from
top 1000 posts from some random subreddits. Seems to be working for r/linux:

~~~python
diff_tokens(tokens_dfs['linux'], tokens_dfs['all']).head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>token</th>
      <th>amount_diff</th>
      <th>amount_norm_diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>5807</th>
      <td>kde</td>
      <td>3060.0</td>
      <td>1.082134</td>
    </tr>
    <tr>
      <th>2543</th>
      <td>debian</td>
      <td>1820.0</td>
      <td>1.048817</td>
    </tr>
    <tr>
      <th>48794</th>
      <td>coc</td>
      <td>1058.0</td>
      <td>1.028343</td>
    </tr>
    <tr>
      <th>9962</th>
      <td>systemd</td>
      <td>925.0</td>
      <td>1.024769</td>
    </tr>
    <tr>
      <th>11588</th>
      <td>gentoo</td>
      <td>878.0</td>
      <td>1.023506</td>
    </tr>
  </tbody>
</table>
</div>

Also looks ok on r/personalfinance:

~~~python
diff_tokens(tokens_dfs['personalfinance'], tokens_dfs['all']).head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>token</th>
      <th>amount_diff</th>
      <th>amount_norm_diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>78063</th>
      <td>vanguard</td>
      <td>1513.0</td>
      <td>1.017727</td>
    </tr>
    <tr>
      <th>18396</th>
      <td>etf</td>
      <td>1035.0</td>
      <td>1.012113</td>
    </tr>
    <tr>
      <th>119206</th>
      <td>checking account</td>
      <td>732.0</td>
      <td>1.008555</td>
    </tr>
    <tr>
      <th>60873</th>
      <td>direct deposit</td>
      <td>690.0</td>
      <td>1.008061</td>
    </tr>
    <tr>
      <th>200917</th>
      <td>joint account</td>
      <td>679.0</td>
      <td>1.007932</td>
    </tr>
  </tbody>
</table>
</div>

And kind of funny with r/drunk:

~~~python
diff_tokens(tokens_dfs['drunk'], tokens_dfs['all']).head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>token</th>
      <th>amount_diff</th>
      <th>amount_norm_diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>515158</th>
      <td>honk honk honk</td>
      <td>144.0</td>
      <td>1.019149</td>
    </tr>
    <tr>
      <th>41088</th>
      <td>pbr</td>
      <td>130.0</td>
      <td>1.017247</td>
    </tr>
    <tr>
      <th>49701</th>
      <td>mo dog</td>
      <td>129.0</td>
      <td>1.017112</td>
    </tr>
    <tr>
      <th>93763</th>
      <td>cheap beer</td>
      <td>74.0</td>
      <td>1.009641</td>
    </tr>
    <tr>
      <th>124756</th>
      <td>birthday dude</td>
      <td>61.0</td>
      <td>1.007875</td>
    </tr>
  </tbody>
</table>
</div>

Seems to be working on this scale.

### A bit larger scale

As the next iteration, I've decided to try the idea on
three months of comments, which I was able to download as dumps
from [pushift.io](https://files.pushshift.io/reddit/).

#### Shaping the data

And it's kind of a lot of data, even compressed:

~~~bash
$ du -sh raw_data/*
11G	raw_data/RC_2018-08.xz
10G	raw_data/RC_2018-09.xz
11G	raw_data/RC_2018-10.xz
~~~

Pandas basically doesn't work on that scale, and unfortunately, I don't
have a personal Hadoop cluster. So I've reinvented a wheel a bit:

<div class="mermaid">
graph LR
    A[Reddit comments]-->B[Reddit comments wiht ngrams]
    B-->C[Ngrams partitioned by subreddit and day]
    C-->D[Counted partitioned ngrams]
</div>

The raw data is stored in line-delimited JSON, like:

~~~bash
$ xzcat raw_data/RC_2018-10.xz | head -n 2
{"archived":false,"author":"TistedLogic","author_created_utc":1312615878,"author_flair_background_color":null,"author_flair_css_class":null,"author_flair_richtext":[],"author_flair_template_id":null,"author_flair_text":null,"author_flair_text_color":null,"author_flair_type":"text","author_fullname":"t2_5mk6v","author_patreon_flair":false,"body":"Is it still r\/BoneAppleTea worthy if it's the opposite?","can_gild":true,"can_mod_post":false,"collapsed":false,"collapsed_reason":null,"controversiality":0,"created_utc":1538352000,"distinguished":null,"edited":false,"gilded":0,"gildings":{"gid_1":0,"gid_2":0,"gid_3":0},"id":"e6xucdd","is_submitter":false,"link_id":"t3_9ka1hp","no_follow":true,"parent_id":"t1_e6xu13x","permalink":"\/r\/Unexpected\/comments\/9ka1hp\/jesus_fking_woah\/e6xucdd\/","removal_reason":null,"retrieved_on":1539714091,"score":2,"send_replies":true,"stickied":false,"subreddit":"Unexpected","subreddit_id":"t5_2w67q","subreddit_name_prefixed":"r\/Unexpected","subreddit_type":"public"}
{"archived":false,"author":"misssaladfingers","author_created_utc":1536864574,"author_flair_background_color":null,"author_flair_css_class":null,"author_flair_richtext":[],"author_flair_template_id":null,"author_flair_text":null,"author_flair_text_color":null,"author_flair_type":"text","author_fullname":"t2_27d914lh","author_patreon_flair":false,"body":"I've tried and it's hit and miss. When it's good I feel more rested even though I've not slept well but sometimes it doesn't work","can_gild":true,"can_mod_post":false,"collapsed":false,"collapsed_reason":null,"controversiality":0,"created_utc":1538352000,"distinguished":null,"edited":false,"gilded":0,"gildings":{"gid_1":0,"gid_2":0,"gid_3":0},"id":"e6xucde","is_submitter":false,"link_id":"t3_9k8bp4","no_follow":true,"parent_id":"t1_e6xu9sk","permalink":"\/r\/insomnia\/comments\/9k8bp4\/melatonin\/e6xucde\/","removal_reason":null,"retrieved_on":1539714091,"score":1,"send_replies":true,"stickied":false,"subreddit":"insomnia","subreddit_id":"t5_2qh3g","subreddit_name_prefixed":"r\/insomnia","subreddit_type":"public"}
~~~

[The first script `add_ngrams.py`](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87#file-add_ngrams-py) reads lines of raw data from stdin,
adds 1-3 lemmatized ngrams and writes lines in JSON to stdout.
As the amount of data is huge, I've gzipped the output. It took around an
hour to process month worth of comments on 12 CPU machine. Spawning more processes didn't help as thw whole thing is quite CPU intense.

~~~bash
$ xzcat raw_data/RC_2018-10.xz | python3.7 add_ngrams.py | gzip > with_ngrams/2018-10.gz
$ zcat with_ngrams/2018-10.gz | head -n 2
{"archived": false, "author": "TistedLogic", "author_created_utc": 1312615878, "author_flair_background_color": null, "author_flair_css_class": null, "author_flair_richtext": [], "author_flair_template_id": null, "author_flair_text": null, "author_flair_text_color": null, "author_flair_type": "text", "author_fullname": "t2_5mk6v", "author_patreon_flair": false, "body": "Is it still r/BoneAppleTea worthy if it's the opposite?", "can_gild": true, "can_mod_post": false, "collapsed": false, "collapsed_reason": null, "controversiality": 0, "created_utc": 1538352000, "distinguished": null, "edited": false, "gilded": 0, "gildings": {"gid_1": 0, "gid_2": 0, "gid_3": 0}, "id": "e6xucdd", "is_submitter": false, "link_id": "t3_9ka1hp", "no_follow": true, "parent_id": "t1_e6xu13x", "permalink": "/r/Unexpected/comments/9ka1hp/jesus_fking_woah/e6xucdd/", "removal_reason": null, "retrieved_on": 1539714091, "score": 2, "send_replies": true, "stickied": false, "subreddit": "Unexpected", "subreddit_id": "t5_2w67q", "subreddit_name_prefixed": "r/Unexpected", "subreddit_type": "public", "ngrams": ["still", "r/boneappletea", "worthy", "'s", "opposite", "still r/boneappletea", "r/boneappletea worthy", "worthy 's", "'s opposite", "still r/boneappletea worthy", "r/boneappletea worthy 's", "worthy 's opposite"]}
{"archived": false, "author": "1-2-3RightMeow", "author_created_utc": 1515801270, "author_flair_background_color": null, "author_flair_css_class": null, "author_flair_richtext": [], "author_flair_template_id": null, "author_flair_text": null, "author_flair_text_color": null, "author_flair_type": "text", "author_fullname": "t2_rrwodxc", "author_patreon_flair": false, "body": "Nice! I\u2019m going out for dinner with him right and I\u2019ll check when I get home. I\u2019m very interested to read that", "can_gild": true, "can_mod_post": false, "collapsed": false, "collapsed_reason": null, "controversiality": 0, "created_utc": 1538352000, "distinguished": null, "edited": false, "gilded": 0, "gildings": {"gid_1": 0, "gid_2": 0, "gid_3": 0}, "id": "e6xucdp", "is_submitter": true, "link_id": "t3_9k9x6m", "no_follow": false, "parent_id": "t1_e6xsm3n", "permalink": "/r/Glitch_in_the_Matrix/comments/9k9x6m/my_boyfriend_and_i_lost_10_hours/e6xucdp/", "removal_reason": null, "retrieved_on": 1539714092, "score": 42, "send_replies": true, "stickied": false, "subreddit": "Glitch_in_the_Matrix", "subreddit_id": "t5_2tcwa", "subreddit_name_prefixed": "r/Glitch_in_the_Matrix", "subreddit_type": "public", "ngrams": ["nice", "go", "dinner", "right", "check", "get", "home", "interested", "read", "nice go", "go dinner", "dinner right", "right check", "check get", "get home", "home interested", "interested read", "nice go dinner", "go dinner right", "dinner right check", "right check get", "check get home", "get home interested", "home interested read"]}
~~~

[The next script `partition.py`](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87#file-partiton-py) reads stdin and writes files like
`2018-10-10_AskReddit` with just ngrams to a folder passed as an
argument.

~~~bash
$ zcat with_ngrams/2018-10.gz | python3.7 parition.py partitions
$ cat partitions/2018-10-10_AskReddit | head -n 5
"gt"
"money"
"go"
"administration"
"building"
~~~

For three months of comments it created a lot of files:

~~~bash
$ ls partitions | wc -l
2715472
~~~

After that I've counted ngrams in partitions with [`group_count.py`](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87#file-group_count-py):

~~~bash
$ python3.7 group_count.py partitions counted
$ cat counted/2018-10-10_AskReddit | head -n 5
["gt", 7010]
["money", 3648]
["go", 25812]
["administration", 108]
["building", 573]
~~~

As r/all isn't a real subreddit and it's not possible to get it from the dump,
I've chosen r/AskReddit as a source of "neutral" ngrams, for that I've
calculated the aggregated count of ngrams with [`aggreage_whole.py`](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87#file-aggregate_whole-py):

~~~bash
$ python3.7 aggreage_whole.py AskReddit > aggregated/askreddit_whole.json
$ cat aggregated/askreddit_whole.json | head -n 5
[["trick", 26691], ["people", 1638951], ["take", 844834], ["zammy", 10], ["wine", 17315], ["trick people", 515], ["people take", 10336], ["take zammy", 2], ["zammy wine", 2], ["trick people take", 4], ["people take zammy", 2]...
~~~

#### Playing with the data

First of all, I've read "neutral" ngrams, removed ngrams appeared
less than 100 times as otherwise it wasn't fitting in RAM
and calculated normalized count:

~~~python
whole_askreddit_df = pd.read_json('aggregated/askreddit_whole.json', orient='values')
whole_askreddit_df = whole_askreddit_df.rename(columns={0: 'ngram', 1: 'amount'})
whole_askreddit_df = whole_askreddit_df[whole_askreddit_df.amount > 99]
whole_askreddit_df['amount_norm'] = norm(whole_askreddit_df.amount)
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>ngram</th>
      <th>amount</th>
      <th>amount_norm</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>trick</td>
      <td>26691</td>
      <td>0.008026</td>
    </tr>
    <tr>
      <th>1</th>
      <td>people</td>
      <td>1638951</td>
      <td>0.492943</td>
    </tr>
    <tr>
      <th>2</th>
      <td>take</td>
      <td>844834</td>
      <td>0.254098</td>
    </tr>
    <tr>
      <th>4</th>
      <td>wine</td>
      <td>17315</td>
      <td>0.005206</td>
    </tr>
    <tr>
      <th>5</th>
      <td>trick people</td>
      <td>515</td>
      <td>0.000153</td>
    </tr>
  </tbody>
</table>
</div>

To be sure that the idea is still valid, I've randomly checked
r/television for 10th October:

~~~python
television_10_10_df = pd \
    .read_json('counted/2018-10-10_television', lines=True) \
    .rename(columns={0: 'ngram', 1: 'amount'})
television_10_10_df['amount_norm'] = norm(television_10_10_df.amount)
television_10_10_df = television_10_10_df.merge(whole_askreddit_df, how='left', on='ngram', suffixes=('_left', '_right'))
television_10_10_df['diff'] = television_10_10_df.amount_norm_left - television_10_10_df.amount_norm_right
television_10_10_df \
    .sort_values('diff', ascending=False) \
    .head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>ngram</th>
      <th>amount_left</th>
      <th>amount_norm_left</th>
      <th>amount_right</th>
      <th>amount_norm_right</th>
      <th>diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>13</th>
      <td>show</td>
      <td>1299</td>
      <td>0.699950</td>
      <td>319715.0</td>
      <td>0.096158</td>
      <td>0.603792</td>
    </tr>
    <tr>
      <th>32</th>
      <td>season</td>
      <td>963</td>
      <td>0.518525</td>
      <td>65229.0</td>
      <td>0.019617</td>
      <td>0.498908</td>
    </tr>
    <tr>
      <th>19</th>
      <td>character</td>
      <td>514</td>
      <td>0.276084</td>
      <td>101931.0</td>
      <td>0.030656</td>
      <td>0.245428</td>
    </tr>
    <tr>
      <th>4</th>
      <td>episode</td>
      <td>408</td>
      <td>0.218849</td>
      <td>81729.0</td>
      <td>0.024580</td>
      <td>0.194269</td>
    </tr>
    <tr>
      <th>35</th>
      <td>watch</td>
      <td>534</td>
      <td>0.286883</td>
      <td>320204.0</td>
      <td>0.096306</td>
      <td>0.190578</td>
    </tr>
  </tbody>
</table>
</div>

And just for fun, limiting to trigrams:

~~~python
television_10_10_df\
    [television_10_10_df.ngram.str.count(' ') >= 2] \
    .sort_values('diff', ascending=False) \
    .head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>ngram</th>
      <th>amount_left</th>
      <th>amount_norm_left</th>
      <th>amount_right</th>
      <th>amount_norm_right</th>
      <th>diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>11615</th>
      <td>better call saul</td>
      <td>15</td>
      <td>0.006646</td>
      <td>1033.0</td>
      <td>0.000309</td>
      <td>0.006337</td>
    </tr>
    <tr>
      <th>36287</th>
      <td>would make sense</td>
      <td>11</td>
      <td>0.004486</td>
      <td>2098.0</td>
      <td>0.000629</td>
      <td>0.003857</td>
    </tr>
    <tr>
      <th>7242</th>
      <td>ca n't wait</td>
      <td>12</td>
      <td>0.005026</td>
      <td>5396.0</td>
      <td>0.001621</td>
      <td>0.003405</td>
    </tr>
    <tr>
      <th>86021</th>
      <td>innocent proven guilty</td>
      <td>9</td>
      <td>0.003406</td>
      <td>1106.0</td>
      <td>0.000331</td>
      <td>0.003075</td>
    </tr>
    <tr>
      <th>151</th>
      <td>watch first episode</td>
      <td>8</td>
      <td>0.002866</td>
      <td>463.0</td>
      <td>0.000137</td>
      <td>0.002728</td>
    </tr>
  </tbody>
</table>
</div>

Seems to be ok, as the next step I've decided to get top 50 discussed topics for every available day:

~~~python
r_television_by_day = diff_n_by_day(  # in the gist
    50, whole_askreddit_df, 'television', '2018-08-01', '2018-10-31',
    exclude=['r/television'],
)
r_television_by_day[r_television_by_day.date == "2018-10-05"].head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>ngram</th>
      <th>amount_left</th>
      <th>amount_norm_left</th>
      <th>amount_right</th>
      <th>amount_norm_right</th>
      <th>diff</th>
      <th>date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>3</th>
      <td>show</td>
      <td>906</td>
      <td>0.725002</td>
      <td>319715.0</td>
      <td>0.096158</td>
      <td>0.628844</td>
      <td>2018-10-05</td>
    </tr>
    <tr>
      <th>8</th>
      <td>season</td>
      <td>549</td>
      <td>0.438485</td>
      <td>65229.0</td>
      <td>0.019617</td>
      <td>0.418868</td>
      <td>2018-10-05</td>
    </tr>
    <tr>
      <th>249</th>
      <td>character</td>
      <td>334</td>
      <td>0.265933</td>
      <td>101931.0</td>
      <td>0.030656</td>
      <td>0.235277</td>
      <td>2018-10-05</td>
    </tr>
    <tr>
      <th>1635</th>
      <td>episode</td>
      <td>322</td>
      <td>0.256302</td>
      <td>81729.0</td>
      <td>0.024580</td>
      <td>0.231723</td>
      <td>2018-10-05</td>
    </tr>
    <tr>
      <th>418</th>
      <td>watch</td>
      <td>402</td>
      <td>0.320508</td>
      <td>320204.0</td>
      <td>0.096306</td>
      <td>0.224202</td>
      <td>2018-10-05</td>
    </tr>
  </tbody>
</table>
</div>

Then I thought that it might be fun to get overall top topics
from daily top topics and make a weekly heatmap with [seaborn](https://seaborn.pydata.org/):

~~~python
r_television_by_day_top_topics = r_television_by_day \
    .groupby('ngram') \
    .sum()['diff'] \
    .reset_index() \
    .sort_values('diff', ascending=False)

r_television_by_day_top_topics.head()
~~~

<div class="table-holder">
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>ngram</th>
      <th>diff</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>916</th>
      <td>show</td>
      <td>57.649622</td>
    </tr>
    <tr>
      <th>887</th>
      <td>season</td>
      <td>37.241199</td>
    </tr>
    <tr>
      <th>352</th>
      <td>episode</td>
      <td>22.752369</td>
    </tr>
    <tr>
      <th>1077</th>
      <td>watch</td>
      <td>21.202295</td>
    </tr>
    <tr>
      <th>207</th>
      <td>character</td>
      <td>15.599798</td>
    </tr>
  </tbody>
</table>
</div>

~~~python
r_television_only_top_df = r_television_by_day \
    [['date', 'ngram', 'diff']] \
    [r_television_by_day.ngram.isin(r_television_by_day_top_topics.ngram.head(10))] \
    .groupby([pd.Grouper(key='date', freq='W-MON'), 'ngram']) \
    .mean() \
    .reset_index() \
    .sort_values('date')

pivot = r_television_only_top_df \
    .pivot(index='ngram', columns='date', values='diff') \
    .fillna(-1)

sns.heatmap(pivot, xticklabels=r_television_only_top_df.date.dt.week.unique())
~~~

![r/television by week](/assets/community_opinion_2/r_television.png)

And it was quite boring, I've decided to try weekday heatmap, but it wasn't
better as topics were the same:

~~~python
weekday_heatmap(r_television_by_day, 'r/television weekday')  # in the gist
~~~

![r/television by weekday](/assets/community_opinion_2/r_television_weekday.png)

Heatmaps for r/programming are also boring:

~~~python
r_programming_by_day = diff_n_by_day(  # in the gist
    50, whole_askreddit_df, 'programming', '2018-08-01', '2018-10-31',
    exclude=['gt', 'use', 'write'],  # selected manully
)
weekly_heatmap(r_programming_by_day, 'r/programming')
~~~

![r/programming](/assets/community_opinion_2/r_programming.png)

Although a heatmap by a weekday is a bit different:

~~~python
weekday_heatmap(r_programming_by_day, 'r/programming by weekday')
~~~

![r/programming by weekday](/assets/community_opinion_2/r_programming_weekday.png)

Another popular subreddit &ndash; r/sports:

~~~python
r_sports_by_day = diff_n_by_day(
    50, whole_askreddit_df, 'sports', '2018-08-01', '2018-10-31',
    exclude=['r/sports'],
)
weekly_heatmap(r_sports_by_day, 'r/sports')
~~~

![r/sports](/assets/community_opinion_2/r_sports.png)

~~~python
weekday_heatmap(r_sports_by_day, 'r/sports by weekday')
~~~

![r/sports weekday](/assets/community_opinion_2/r_sports_weekday.png)

As the last subreddit for giggles &ndash; r/drunk:

~~~python
r_drunk_by_day = diff_n_by_day(50, whole_askreddit_df, 'drunk', '2018-08-01', '2018-10-31')
weekly_heatmap(r_drunk_by_day, 'r/drunk')
~~~

![r/drunk](/assets/community_opinion_2/r_drunk.png)

~~~python
weekday_heatmap(r_drunk_by_day, "r/drunk by weekday")
~~~

![r/drunk weekday](/assets/community_opinion_2/r_drunk_weekday.png)

### Conclusion

The idea kind of works for generic topics of subreddits, but can't
be used for finding trends.

[Gist with everything](https://gist.github.com/nvbn/d062b62ed340732c5b6034f40bd78e87).
