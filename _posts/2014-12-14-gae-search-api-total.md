---
layout:     post
title:      Getting total count of indexed documents in the GAE Search API
date:       2014-12-14 20:54:00
keywords:   python, appengine, GAE, Search API
---

Around a month ago I was stuck with task &ndash; I had to get total count of indexed
documents in the GAE Search API. Sounds simple, but not &ndash; this API doesn't
have a method for doing that, it has something similar &ndash; `storage_usage`, but
this attribute [contains size of index in bytes](https://cloud.google.com/appengine/docs/python/search/indexclass#Index_storage_usage).
But the API provides method for receiving ids of documents, so I've tried:

```python
>>> len(index.get_range(ids_only=True))
100
>>> len(index.get_range(ids_only=True, limit=1000))
1000
>>> len(index.get_range(ids_only=True, limit=1001))
ValueError: limit, 1001 must be <= 1000
```

And another pitfall &ndash; `get_range` [couldn't return more than 1000 ids](https://cloud.google.com/appengine/docs/python/search/#Python_Index_schemas).
So I've tried to run it in cycle:

```python
def calculate_count():
    # Starts with 1 because in other iteration new range will
    # start with last item from previous range:
    result = 1
    start_id = None
    while True:
        if start_id is None:
            index_range = index.get_range(ids_only=True, limit=1000)
        else:
            index_range = index.get_range(start_id=start_id,
                                          ids_only=True, limit=1000)
        if len(index_range) > 1:
            start_id = index_range[-1].doc_id
            result += len(index_range) - 1  # Ignore last item from previous range
        else:
            return result

>>> calculate_count()
DeadlineExceededError
```

Yep, It takes more than 60 seconds. But then I've tried to run each iteration
in deferred and write result to memcahe:

```python
def calculate_count(start_id=None, result=1):
    if start_id is None:
        memcache.delete('RESULT')
        index_range = index.get_range(ids_only=True, limit=1000)
    else:
        index_range = index.get_range(start_id=start_id,
                                      ids_only=True, limit=1000)
    if len(index_range) > 1:
        deferred.defer(calculate_count,
                       index_range[-1].doc_id,
                       len(index_range) - 1 + result)
    else:
        memcache.set('RESULT', result)

>>> calculate_count()
# Wait few minutes...
>>> memcache.get('RESULT')
1398762
```
And It works!
