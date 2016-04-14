---
layout:     post
title:      "Freeze time in tests even with GAE datastore"
date:       2016-04-14 14:40:00 +03:00
keywords:   python, gae
---

It's not so rare thing to freeze time in tests and for that task
I'm using [freezegun](https://github.com/spulec/freezegun) and it
works nice almost every time:

~~~python
from freezegun import freeze_time


def test_get_date():
    with freeze_time("2016.1.1"):
        assert get_date() == datetime(2016, 1, 1)
~~~

But not with GAE datastore. Assume that we have a model `Document`
with `created_at = db.DateTimeProperty(auto_now_add=True)`, so test like:

~~~python
from freezegun import freeze_time


def test_created_at_():
    with freeze_time('2016.1.1'):
        doc = Document()
        doc.put()
        assert doc.created_at == datetime(2016, 1, 1)
~~~

Will fail with:

~~~
BadValueError: Unsupported type for property created_at: <class 'freezegun.api.FakeDatetime'>
~~~

But it can be easily fixed if we monkey patch GAE internals:

~~~python
from contextlib import contextmanager
from google.appengine.api import datastore_types
from mock import patch
from freezegun import freeze_time as _freeze_time
from freezegun.api import FakeDatetime


@contextmanager
def freeze_time(*args, **kwargs):
    with patch('google.appengine.ext.db.DateTimeProperty.data_type',
                new=FakeDatetime), freeze_time(*args, **kwargs):
        datastore_types._VALIDATE_PROPERTY_VALUES[FakeDatetime] = \
            datastore_types.ValidatePropertyNothing
        datastore_types._PACK_PROPERTY_VALUES[FakeDatetime] = \
            datastore_types.PackDatetime
        datastore_types._PROPERTY_MEANINGS[FakeDatetime] = \
            datastore_types.entity_pb.Property.GD_WHEN
        yield
~~~

And now it works!
