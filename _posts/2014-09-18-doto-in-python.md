---
layout:     post
title:      doto from clojure in python
date:       2014-09-18 12:32:18
---

When i writing code in clojure i can use good macro &ndash; [doto](http://clojuredocs.org/clojure_core/1.3.0/clojure.core/doto).

With whom python code like:


```python
window = QMainWindow()
window.setTitle(TITLE)
window.setWindowFlags(Qt.FramelessWindowHint)
window.setAttribute(Qt.WA_TransparentForMouseEvents, True)
window.show()
```

can be translated in clojure code like:

```clojure
(doto (QMainWindow.)
      (.setTitle title)
      (.setWindowFlags Qt/FramelessWindowHint)
      (.setAttribute Qt/WA_TransparentForMouseEvents True)
      (.show)
```

And i wrote hackish class for doing something similar in python.

```python
from functools import partial


class DoTo(object):
    def __init__(self, obj):
        self._obj = obj

    def _do(self, name, *args, **kwargs):
        getattr(self._obj, name)(*args, **kwargs)
        return self

    def __getattr__(self, item):
        return partial(self._do, item)
```

Usage:

```python
window = QMainWindow()
DoTo(window)\
    .setTitle(TITLE)\
    .setWindowFlags(Qt.FramelessWindowHint)\
    .setAttribute(Qt.WA_TransparentForMouseEvents, True)\
    .show()
```
