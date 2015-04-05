---
layout:     post
title:      "Simple DSL for creating html in Python"
date:       2015-04-04 13:47:00
keywords:   python, html
---

In Clojure world we have [hiccup](https://github.com/weavejester/hiccup) for creating html:

```clojure
[:div.top
  [:h1 "Hello world]
  [:p hello-text]]
```

In JS world we have [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html) (it's not internal DSL, but it's relevant):

```js
var html = (
    <div className="top">
        <h1>Hello world</h1>
        <p>{helloText}</p>
    </div>
);
```

But in Python we don't have similar DSL, and isn't it be cool
(actually it isn't, I don't recommend to do something like this,
it's just an experiment) to write something like this:
 
```python
h.div(klass='top')[
    h.h1["Hello word"],
    h.p[hello_text]]
```

Let's start with simplest part, implement ability to call `h.p` and
`h.div`, for this I'll use magic of metaclasses and `__getattr__`:

```python
class HBase(type):
    def __getattr__(cls, name):
        return cls(name)
        
        
class h(metaclass=HBase):
    def __init__(self, name):
        self._name = name
        
    def __str__(self):
        return '<{name}></{name}>'.format(name=self._name)
        
    def __repr__(self):
        return str(self)
        
        
In [3]: h.div
Out [3]: <div></div>
```

It's very simple, now is the time to add ability to define
childs for html element with `h.div[h.h2, h.p]`, magic of `__getitem__`
will help me:

```python
class HBase(type):
    def __getattr__(cls, name):
        return cls(name)


class h(metaclass=HBase):
    def __init__(self, name, childs=None):
        self._name = name
        self._childs = childs
        
    def __getitem__(self, childs):
        if not hasattr(childs, '__iter__'):
            childs = [childs]
        return h(self._name, childs)
        
    def _format_childs(self):
        if self._childs is None:
            return ''
        if isinstance(self._childs, str):
            return self._childs
        else:
            return '\n'.join(map(str, self._childs))
        
    def __str__(self):
        return '<{name}>{childs}</{name}>'.format(
            name=self._name,
            childs=self._format_childs())
            
    def __repr__(self):
        return str(self)


In [7]: h.div[h.h2['Hello world'], h.p['Just text.']]
Out [7]:
<div><h2>Hello world</h2>
<p>Just text.</p></div>
```

Cool, it works! So now let's add ability to define attributes
with `h.div(id="my-id")`, but before I need to notice that in
python we not allowed to use `class` as a name of argument,
so I'll use `klass` instead. So here I'll use magic of `__call__`:

```python
class HBase(type):
    def __getattr__(cls, name):
        return cls(name)


class h(metaclass=HBase):
    def __init__(self, name, childs=None, attrs=None):
        self._name = name
        self._childs = childs
        self._attrs = attrs
        
    def __getitem__(self, childs):
        if not hasattr(childs, '__iter__'):
            childs = [childs]
        return h(self._name, childs, self._attrs)
        
    def __call__(self, **attrs):
        return type(self)(self._name, self._childs, attrs)
        
    def _format_attr(self, name, val):
         if name == 'klass':
             name = 'class'
         return '{}="{}"'.format(name, str(val).replace('"', '\"'))
        
    def _format_attrs(self):
        if self._attrs:
            return ' ' + ' '.join([self._format_attr(name, val)
                                   for name, val in (self._attrs).items()])
        else:
            return ''
        
    def _format_childs(self):
        if self._childs is None:
            return ''
        if isinstance(self._childs, str):
            return self._childs
        else:
            return '\n'.join(map(str, self._childs))
        
    def __str__(self):
        return '<{name}{attrs}>{childs}</{name}>'.format(
            name=self._name,
            attrs=self._format_attrs(),
            childs=self._format_childs())
            
    def __repr__(self):
        return str(self)
            
            
In [19]: hello_text = 'Hi!'
In [20]: h.div(klass='top')[
          h.h1["Hello word"],
          h.p[hello_text]]
Out [20]:
<div class="top"><h1>Hello word</h1>
<p>Hi!</p></div>
```

Yep, it's working, and it's a simple DSL/template language just in
44 lines of code, thank you to Python magic methods. It can be used
in more complex situations, for example &ndash; blog page:

```python
from collections import namedtuple


BlogPost = namedtuple('BlogPost', ('title', 'text'))
posts = [BlogPost('Title {}'.format(n),
                  'Text {}'.format(n))
         for n in range(5)]

In [30]: h.body[
    h.div(klass='header')[
        h.h1['Web page'],
        h.img(klass='logo', src='logo.png')],
    h.div(klass='posts')[(
        h.article[
            h.h2(klass='title')[post.title],
            post.text]
        for post in posts)]]
Out [30]
<body><div class="header"><h1>Web page</h1>
<img class="logo" src="logo.png"></img></div>
<div class="posts"><article><h2 class="title">Title 0</h2>
Text 0</article>
<article><h2 class="title">Title 1</h2>
Text 1</article>
<article><h2 class="title">Title 2</h2>
Text 2</article>
<article><h2 class="title">Title 3</h2>
Text 3</article>
<article><h2 class="title">Title 4</h2>
Text 4</article></div></body>
```

And after that little experiment I have to say that
everything is a LISP if you're brave enough =)
