---
layout:     post
title:      "Filmstrip from subtitles and stock images"
date:       2018-06-19 00:23:00
keywords:   python, nltk, stock photos
image:      /assets/filmstrip/preview.png
---

It's possible to find subtitles for almost every movie or TV series. And there's also stock images
with anything imaginable. Wouldn't it be fun to connect this two things and make a sort of a filmstrip
with a stock image for every caption from subtitles?

**TLDR:** the result is silly:

<iframe src="/assets/filmstrip/burgers.html" width="766" height="431"></iframe>

For the subtitles to play with I chose subtitles for [Bob's Burgers &ndash; The Deeping](https://www.opensubtitles.org/en/subtitles/4800634/bob-s-burgers-the-deepening-en).
At first, we need to parse it with [pycaption](https://pycaption.readthedocs.io):

```python
from pycaption.srt import SRTReader

lang = 'en-US'
path = 'burgers.srt'

def read_subtitles(path, lang):
    with open(path) as f:
        data = f.read()
        return SRTReader().read(data, lang=lang)
        
        
subtitles = read_subtitles(path, lang)
captions = subtitles.get_captions(lang)
```
```python
>>> captions
['00:00:04.745 --> 00:00:06.746\nShh.', '00:00:10.166 --> 00:00:20.484\n...
```

As a lot of subtitles contains html, it's important to remove tags before future processing,
it's very easy to do with [lxml](http://lxml.de/):

```python
import lxml.html

def to_text(raw_text):
    return lxml.html.document_fromstring(raw_text).text_content()
```
```python
to_text('<i>That shark is ruining</i>')
'That shark is ruining'
```

For finding most significant words in the text we need to tokenize it, lemmatize
(replace every different form of a word with a common form) and remove stop words.
It's easy to do with [NLTK](https://www.nltk.org):

```python
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

def tokenize_lemmatize(text):
    tokens = word_tokenize(text)
    lemmatizer = WordNetLemmatizer()
    lemmatized = [lemmatizer.lemmatize(token.lower())
                  for token in tokens if token.isalpha()]
    stop_words = set(stopwords.words("english"))
    return [lemma for lemma in lemmatized if lemma not in stop_words]
```
```python
>>> tokenize_lemmatize('That shark is ruining')
['shark', 'ruining']
```

And after that we can just combine the previous two functions and find most frequently used words:

```python
from collections import Counter

def get_most_popular(captions):
    full_text = '\n'.join(to_text(caption.get_text()) for caption in captions)
    tokens = tokenize_lemmatize(full_text)
    return Counter(tokens)
    
  
most_popular = get_most_popular(captions)
```
```python
most_popular
Counter({'shark': 68, 'oh': 32, 'bob': 29, 'yeah': 25, 'right': 20,...
```

It's not the best way to find the most important words, but it kind of works.

After that it's straightforward to extract keywords from a single caption:

```python
def get_keywords(most_popular, text, n=2):
    tokens = sorted(tokenize_lemmatize(text), key=lambda x: -most_popular[x])
    return tokens[:n]
```
```python
>>> captions[127].get_text()
'Teddy, what is wrong with you?'
>>> get_keywords(most_popular, to_text(captions[127].get_text()))
['teddy', 'wrong']
```

The next step is to find a stock image for those keywords. There's not that many properly working
and documented stocks, so I chose to use [Shutterstock API](https://developers.shutterstock.com/).
It's limited to 250 requests per hour, but it's enough to play.

From their API we only need to use [/images/search](https://developers.shutterstock.com/images/apis/get/images/search).
We will search for the most popular photo:

```python
import requests

# Key and secret of your app
stock_key = ''
stock_secret = ''

def get_stock_image_url(query):
    response = requests.get(
        "https://api.shutterstock.com/v2/images/search",
        params={
            'query': query,
            'sort': 'popular',
            'view': 'minimal',
            'safe': 'false',
            'per_page': '1',
            'image_type': 'photo',
        },
        auth=(stock_key, stock_secret),
    )
    data = response.json()
    try:
        return data['data'][0]['assets']['preview']['url']
    except (IndexError, KeyError):
        return None
```
```
>>> get_stock_image_url('teddy wrong')
'https://image.shutterstock.com/display_pic_with_logo/2780032/635833889/stock-photo-guilty-boyfriend-asking-for-forgiveness-presenting-offended-girlfriend-a-teddy-bear-toy-lady-635833889.jpg'
```

The image looks *relevant*:

![teddy wrong](https://image.shutterstock.com/display_pic_with_logo/2780032/635833889/stock-photo-guilty-boyfriend-asking-for-forgiveness-presenting-offended-girlfriend-a-teddy-bear-toy-lady-635833889.jpg)

Now we can create a proper card from a caption:
```python
def make_slide(most_popular, caption):
    text = to_text(caption.get_text())
    if not text:
        return None

    keywords = get_keywords(most_popular, text)
    query = ' '.join(keywords)
    if not query:
        return None

    stock_image = get_stock_image_url(query)
    if not stock_image:
        return None

    return text, stock_image
```
```python
make_slide(most_popular, captions[132])
('He really chewed it...\nwith his shark teeth.', 'https://image.shutterstock.com/display_pic_with_logo/181702384/710357305/stock-photo-scuba-diver-has-shark-swim-really-close-just-above-head-as-she-faces-camera-below-710357305.jpg')
```

The image is kind of relevant:

![He really chewed it...with his shark teeth.](https://image.shutterstock.com/display_pic_with_logo/181702384/710357305/stock-photo-scuba-diver-has-shark-swim-really-close-just-above-head-as-she-faces-camera-below-710357305.jpg)

After that we can select captions that we want to put in our filmstrip
and generate html like the one in the TLDR section:

```python
output_path = 'burgers.html'
start_slide = 98
end_slide = 200


def make_html_output(slides):
    html = '<html><head><link rel="stylesheet" href="./style.css"></head><body>'
    for (text, stock_image) in slides:
        html += f'''<div class="box">
            <img src="{stock_image}" />
            <span>{text}</span>
        </div>'''
    html += '</body></html>'
    return html


interesting_slides = [make_slide(most_popular, caption)
                      for caption in captions[start_slide:end_slide]]
interesting_slides = [slide for slide in interesting_slides if slide]

with open(output_path, 'w') as f:
    output = make_html_output(interesting_slides)
    f.write(output)
```

And the result - [burgers.html](/assets/filmstrip/burgers.html).

Another example, even worse and a bit **NSFW**, [It's Always Sunny in Philadelphia &ndash; Charlie Catches a Leprechaun](/assets/filmstrip/sunny.html).

[Gist with the sources](https://gist.github.com/nvbn/72949069d0e3bb01bf5549c4f2dc9cb3).
