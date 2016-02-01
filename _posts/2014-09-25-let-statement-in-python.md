---
layout:     post
title:      let statement in python
date:       2014-09-25 05:54:00
keywords:   python, let statement  
---

Today, when i wrote another context manager, i came up with the idea &ndash; write `let`
statement in python using context manager.

First i invented simple realisation, where we manually pass `locals`:

~~~python
from contextlib import contextmanager


@contextmanager
def let(locals_, **bindings):
    original = {var: locals_.get(var) for var in bindings.keys()}
    locals_.update(bindings)
    yield
    locals_.update(original)
~~~

And usage:

~~~python
>>> a = 1
>>> b = 2
>>> with let(locals(), a=10, b=20):
...     print(a, b)  # inside `let` scope
... 
(10, 20)
>>> print(a, b)  # outside of `let` scope
(1, 2)

~~~

Looks ugly. But we can use little piece of magic with `inspect`. We can get outer frame and get his `locals`

~~~python
from contextlib import contextmanager
from inspect import currentframe, getouterframes


@contextmanager
def let(**bindings):
    frame = getouterframes(currentframe(), 2)[-1][0] # 2 because first frame in `contextmanager` decorator  
    locals_ = frame.f_locals
    original = {var: locals_.get(var) for var in bindings.keys()}
    locals_.update(bindings)
    yield
    locals_.update(original)
~~~

Now we don't need to pass `locals` explicitly:

~~~python
>>> a = 3
>>> b = 4
>>> with let(a=33, b=44):
...     print(a, b)
... 
(33, 44)
>>> print(a, b)
(3, 4)
~~~