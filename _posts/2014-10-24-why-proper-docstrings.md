---
layout:     post
title:      Why I like writing proper docstrings while coding in python
date:       2014-10-24 04:40:00
keywords:   python, docstring, sphinx, sphinx-doc, ide, pycharm 
---

Everyone knows that having proper docstrings in code is good, and most straightforward reason
why &mdash; it's in-place documentation for classes, functions and methods.
So that's another three reasons:

#### Sphinx and Read the Docs

For example, we have simple function with docstring:

~~~python
def as_chan(create_chan):
    """Decorator which creates channel and coroutine. Passes channel as a
    first value to coroutine and returns that channel.

    Usage:

    .. code-block:: python

        @as_chan
        def thermo(chan, unit):
            while True:
                yield chan.put(convert(thermo_get(), unit))

        @coroutine
        def main():
            thermo_chan = thermo('C')
            while True:
                print((yield thermo_chan.get()))  # prints current temperature

    :param create_chan: Type of channel.
    :type create_chan: type[Channel]
    :returns: Created coroutine.

    """
    def decorator(fn):
        def wrapped(*args, **kwargs):
            chan = create_chan()
            coroutine(fn)(chan, *args, **kwargs)
            return chan
        return wrapped
    return decorator
~~~

And using [sphinx-apidoc](http://sphinx-doc.org/man/sphinx-apidoc.html) and
[Read the Docs](https://readthedocs.org/) we can generate cool documentation
[like this](https://microasync.readthedocs.io/en/latest/microasync.html#microasync.async.as_chan).
And it'll be automatically generated after each push to github.

#### Quick help in IDE

I've been using [pycharm](https://www.jetbrains.com/pycharm/), but I think there's something similar in other IDEs.

Suppose we have function ([full source code](https://github.com/nvbn/microasync/blob/master/microasync/device.py)):

~~~python
def get_servo(num):
    """Creates write and read channels for servo. Should be used
    only in coroutine.

    Usage:

    .. code-block:: python
    
        servo_set, servo_get = get_servo(1)
        yield servo_set.put(90)  # set servo to 90 degrees
        yield servo_get.get()  # prints current servo degree

    :param num: Number of servo.
    :type num: int
    :returns: Write and read channels.
    :rtype: (Channel, SlidingChannel)

    """
~~~
It's not simple to guess what it returns and how work with it, but if we just press
`ctrl+Q`:

![screenshot](/assets/docstring_1.png)

#### Warnings on wrong type and better autocomplete with type hinting

Assume we started writing simple function:

~~~python
def get_user_groups(user):
    """
    :type user: User 
    :rtype: list[Group]
    """
~~~

With type hinting we can use proper autocomplete inside it:

![screenshot](/assets/docstring_2.png)

And for result of the function:

![screenshot](/assets/docstring_3.png)

And we can see warnings when pass value of wrong type to the function:
 
![screenshot](/assets/docstring_4.png)

[More about type hinting.](http://www.jetbrains.com/pycharm/webhelp/type-hinting-in-pycharm.html)
