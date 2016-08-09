---
layout:     post
title:      "Partial application and piping with ... and &#64;"
date:       2016-08-09 14:00:00
keywords:   python
---

In newer versions of Python we have two not much used features: ellipsis:

~~~python
>>> print(...)
Ellipsis
~~~

And matrix multiplication operator:

~~~python
class Dummy(str):
    def __matmul__(self, other):
        print('{}@{}'.format(self, other))


>>> Dummy('ok') @ 'there'
ok@there
~~~

So let's start with `...`, in Scala we can partially apply (or curry) function with `_`:

~~~scala
def add(x: Int, y: Int) = x + y
val addOne = add(1, _: Int)
addOne(5)  6: Int
~~~

Wouldn't it be nice to have similar option in Python, like:

~~~python
def add(x, y):
    return x + y
    
addFive = add(..., 5)
~~~

And we can easily implement it with some decorator:

~~~python
from functool import wraps

class Partial:
    def __init__(self, fn, args, kwargs):
        self._fn = fn
        self._args = args
        self._kwargs = kwargs

    def __call__(self, replacement):
        args = [replacement if arg is ... else arg
                for arg in self._args]
        kwargs = {key: replacement if val is ... else val
                  for key, val in self._kwargs.items()}
        return self._fn(*args, **kwargs)

    def __repr__(self):
        return '<Partial: {}(*{}, **{})>'.format(
            self._fn.__name__, repr(self._args), repr(self._kwargs))


def ellipsis_partial(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        ellipsises = (list(args) + list(kwargs.values())).count(...)
        if ellipsises > 1:
            raise TypeError('Only one ... allowed as an argument.')
        elif ellipsises:
            return Partial(fn, args, kwargs)
        else:
            return fn(*args, **kwargs)

    return wrapper
~~~

So here if we find `...` in arguments, we return `Partial` object. And
when the object called &ndash; we replace `...` with passed value. In action:

~~~python
@ellipsis_partial
def add(x, y):
    return x + y


addFive = add(5, ...)
>>> addFive(10)
15
~~~

And it works! So back to matrix multiplication operator. In F#
there's nice piping operators:

~~~ml
> [1..10] |> List.filter (fun x -> x % 3 = 0)
val it : int list = [3; 6; 9]
~~~

So with our operator in Python it should look like:

~~~python
range(1, 10) @ filter(lambda x: x % 3 == 0, ...)
~~~

And we can easily implement it just by adding `__rmatmul__` to `Partial`:

~~~python
class Partial:
    def __init__(self, fn, args, kwargs):
        self._fn = fn
        self._args = args
        self._kwargs = kwargs

    def __call__(self, replacement):
        args = [replacement if arg is ... else arg
                for arg in self._args]
        kwargs = {key: replacement if val is ... else val
                  for key, val in self._kwargs.items()}
        return self._fn(*args, **kwargs)

    def __rmatmul__(self, replacement):
        return self(replacement)

    def __repr__(self):
        return '<Partial: {}(*{}, **{})>'.format(
            self._fn.__name__, repr(self._args), repr(self._kwargs))
~~~


And in action:

~~~python
filter = ellipsis_partial(filter)
to_list = ellipsis_partial(list)
>>> range(1, 10) @ filter(lambda x: x % 3 == 0, ...) @ to_list(...)
[3, 6, 9]
~~~

And we can use it in even more complex cases:

~~~python
map = ellipsis_partial(map)
join = ellipsis_partial(str.join)
>>> range(1, 10) @ map(lambda x: x + 4, ...) \
                 @ filter(lambda x: x % 3 == 0, ...) \
                 @ map(str, ...) \
                 @ join(', ', ...)
6, 9, 12
~~~

But it's a bit not nice to wrap all callables in `ellipsis_partial`, 
we can use some hacks with `inspect` or module loaders to doing it automatically, but it's too magic
for me. So we can add little function that wrap and call:

~~~python
def _(fn, *args, **kwargs):
    return ellipsis_partial(fn)(*args, **kwargs)
~~~

Usage:

~~~python
from functools import reduce
>>> range(1, 10) @ map(lambda x: x + 4, ...) \
                 @ filter(lambda x: x % 3 == 0, ...) \
                 @ _(reduce, lambda x, y: x * y, ...) \
                 @ _('value: {}'.format, ...)
value: 648
~~~

However it may look strange and unpythonic, but I guess it would be nice
to see something like this in future Python releases.

[Gist with sources.](https://gist.github.com/nvbn/d71fee5b1cad58d5eb80e369194f4155)
