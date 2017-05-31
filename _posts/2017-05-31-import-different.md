---
layout:     post
title:      "Import packages depending on Python version"
date:       2017-05-31 13:00:00
keywords:   python
---

While working on [py-backwards](https://github.com/nvbn/py-backwards) and it's
[setuptools integration](https://github.com/nvbn/py-backwards-packager) I found
an interesting problem, how to transparently allow people with different Python
versions to use different packages. So, imagine we have a package with a structure:

~~~yaml
package
  __init__.py
  _compiled_2_7
    package
      __init__.py
      main.py
  _compiled_3_3
    package
      __init__.py
      main.py
  _compiled_3_4
    package
      __init__.py
      main.py
  _compiled_3_5
    package
      __init__.py
      main.py
  _compiled_3_6
    package
      __init__.py
      main.py
~~~

And, for example, on Python 2.7 we need to use the package from `_compiled_2_7`, on 3.3 from
`_compiled_3_3` and etc.

First of all, we know that if we import `package.main`, `package.__init__` would be imported first:

~~~python
# __init__.py
print('init')

# main.py
print('main')

# REPL
>>> import package.main
init
main

>>> from package import main
init
main

# shell
➜ python -m package.main
init
main
~~~

So it works all the time. And now if we put special bootstrap script, which would change `sys.path`
depending on current Python version, we can easily import the package that we need:

~~~python
import sys
import os

VERSIONS = {'_compiled_2_7': (2, 7),
            '_compiled_3_0': (3, 0),
            '_compiled_3_1': (3, 1),
            '_compiled_3_2': (3, 2),
            '_compiled_3_3': (3, 3),
            '_compiled_3_4': (3, 4),
            '_compiled_3_5': (3, 5),
            '_compiled_3_6': (3, 6)}
root = os.path.abspath(os.path.dirname(__file__))


def _get_available_versions():
    for version in os.listdir(root):
        if version in VERSIONS:
            yield version


def _get_version():
    available_versions = sorted(_get_available_versions())[::-1]
    for version in available_versions:
        if VERSIONS[version] <= sys.version_info:
            return version


# We should pass `__name__` as an argument, because
# we can't access `__name__` after module deletion
def _import_module(name):
    version = _get_version()
    version_path = os.path.join(root, version)
    sys.path.insert(0, version_path)
    del sys.modules[name]
    __import__(name)


_import_module(__name__)
~~~

Let's try it on our package, but first, we need to fill `_compiled_*/package/__init__.py` with:
 
~~~python
print('init 2.7')  # replace with required version
~~~

And `_compiled_*/package/main.py` with:

~~~python
print('main 2.7')  # replace with required version
~~~

So now we can try it with Python 2.7:

~~~python
# REPL
>>> import package
init 2.7

>>> import package.main
init 2.7
main 2.7

>>> from package import main
init 2.7
main 2.7

# shell
➜ python2 -m package.main
init 2.7
main 2.7
~~~

And with Python 3.5:

~~~python
# REPL
>>> import package
init 3.5

>>> import package.main
init 3.5
main 3.5

>>> from package import main
init 3.5
main 3.5

# shell
➜ python3 -m package.main
init 3.5
main 3.5
~~~

It works!
