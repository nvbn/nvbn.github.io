---
layout:     post
title:      "Abusing annotations with dependency injection"
date:       2016-08-07 08:00:00
keywords:   python, dependency injection
---

Python 3 has a nice feature &ndash; type annotations:

~~~python
def add(x: int, y: int) -> int:
    return x + y
~~~

That can be used by IDEs and stuff like [mypy](https://github.com/python/mypy)
for type checking.  However we can easily access it:

~~~python
>>> add.__annotations__
{'return': int, 'x': int, 'y': int}
~~~

And use it for things like dependency injection. For example we have a
web app:

~~~python
def get_db_connection() -> abc.DBConnection:
    ...


def get_routes() -> abc.Router:
    ...


def get_cache(db: abc.DBConnection) -> abc.CacheManager:
    ...


def init_app():
    db = get_db_connection()
    routes = get_routes()
    cache = get_cache(db)
    app = Application(routes=routes,
                      db=db,
                      cache=cache)
    app.run()


if __name__ == '__main__':
    init_app()
~~~

Looks a bit Java-like with interfaces (abstract classes, abc), but it's useful
in huge apps. However components are tightly coupled, and we need to use monkey patching for testing it.

Let's examine annotations: 

~~~python
>>> get_cache.__annotations__
{'db': abc.DBConnection, 'return': abc.CacheManager}
~~~

We can see that the function requires `abc.DBConnection` and provides
`abc.CacheManager`. We need to track all functions like this, it'll be easy with
some decorator:

~~~python
from weakref import WeakValueDictionary

_provides = WeakValueDictionary()


def provides(fn):
    """Register function that provides something."""
    try:
        _provides[fn.__annotations__['return']] = fn
    except KeyError:
        raise ValueError('Function not annotated.')

    return fn
~~~

We use `WeakValueDictionary` in case function somehow can be deleted.

Let's apply this decorator:

~~~python
@provides
def get_db_connection() -> abc.DBConnection:
    ...


@provides
def get_routes() -> abc.Router:
    ...


@provides
def get_cache(*, db: abc.DBConnection) -> abc.CacheManager:
    ...
~~~


And move dependencies of main function to arguments:

~~~python
def init_app(*, routes: abc.Router,
             db: abc.DBConnection,
             cache: abc.CacheManager):
    app = Application(routes=routes,
                      db=db,
                      cache=cache)
    app.run()
~~~

So we can think about our functions as a graph:

<div class="mermaid">
graph TB
    A[init_app]---B[get_routes]
    A---C[get_db_connection]
    A---D[get_cache]
    D---C
</div>

And we can easily write injector that resolve and inject dependencies:

~~~python
class Injector:
    """Resolve and inject dependencies."""

    def __init__(self):
        self._resolved = {}

    def _get_value(self, name):
        """Get dependency by name (type)."""
        if name not in _provides:
            raise ValueError("Dependency {} not registered.".format(
                name))
        
        if name not in self._resolved:           
            fn = _provides[name]
            kwargs = self._get_dependencies(fn)
            return fn(**kwargs)
        return self._resolved[name]

    def _get_dependencies(self, fn):
        """Get dependencies for function."""
        return {key: self._get_value(value)
                for key, value in fn.__annotations__.items()
                if key != 'return'}

    def run(self, fn):
        """Resolve dependencies and run function."""
        kwargs = self._get_dependencies(fn)
        return fn(**kwargs)
~~~

So we can make our app work by adding:

~~~python
if __name__ == '__main__':
    Injector().run(init_app)
~~~

Although this approach is simple and straightforward, it's overkill for most of apps.

[Package on github](https://github.com/nvbn/anndi).
