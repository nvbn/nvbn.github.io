---
layout:     post
title:      "Using Werkzeug with Django on App Engine"
date:       2015-07-17 16:16:00
keywords:   python, django, werkzeug, gae
---

Werkzeug has a pretty decent error page with in-browser debugger and some other
features. In just Django project it can be easily used with
[django-extensions](https://github.com/django-extensions/django-extensions)
with:

~~~bash
./manage.py runserver_plus
~~~

But we can't use this approach with gae, because it doesn't use `runserver`, it
just works through wsgi.
So instead we should wrap our wsgi application with `DebuggedApplication`.
So in `wsgi.py` (or another file where wsgi
app defined) we need to change an app initialization to something like:

~~~python
from django.core.wsgi import get_wsgi_application
from django.conf import settings
from werkzeug.debug import DebuggedApplication

application = get_wsgi_application()
if settings.DEBUG:
    app = DebuggedApplication(app, True)
    # Werkzeug won't work without exceptions propagation
    settings.DEBUG_PROPAGATE_EXCEPTIONS = True
~~~

And that's all.
