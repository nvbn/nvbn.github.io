---
layout:     post
title:      Destructuring arguments in CoffeeScript 
date:       2014-11-03 21:10:00
keywords:   coffeescript, arguments destructuring, underscore.js
---

CoffeeScript has good and fairly undocumented feature &mdash; destructuring arguments. It's
very similar to [binding forms](http://clojure.org/special_forms#toc18) from clojure
and a bit like pattern matching like in scala and erlang. It has syntax similar to [destructuring assignment](http://coffeescript.org/#destructuring)
but works with functions (and methods) arguments.

Simple examples:

```coffeescript
getUppercaseName = ({name}) -> name.toUpperCase()
getUppercaseName name: 'test'
# 'TEST'

head = ([x, ...]) -> x
head [1, 2, 3, 4]
# 1

tail = ([_, xs...]) -> xs
tail [1, 2, 3, 4]
# [ 2, 3, 4 ]

prettifyUser = ({groups: {names: groupNames}, username}) ->
    "#{username}: #{groupNames.join(', ')}"
prettifyUser 
    groups: {names: ['a', 'b', 'c']}
    username: 'user'
# 'user: a, b, c'
```

Looks useful? But will be more if we combine it with
[underscore.js](http://underscorejs.org/). Assume we need to transform result of
`$.serializeArray()` like:

```json
[
    {"name": "title", "value": "Test Title"},
    {"name": "text", "value": ""},
    {"name": "tags", "value": "Python"},
    {"name": "tags", "value": "CoffeeScript"},
    {"name": "tags", "value": "Clojure"},
    {"name": "csrfmiddlewaretoken", "value": "token"}
]
```

To something like (fields with blank value and service fields should be removed, values of
fields with same name should be presented as a list):

```json
{
    "title": "Test Title",
    "tags": ["Python", "CoffeeScript", "Clojure"]
}
```

Let's start with imperative solution:

```coffeescript
transform = (serializedForm) ->
    groupByName = ->
        result = {}
        for field in serializedForm
            if field.value != '' and field.name != 'csrfmiddlewaretoken'
                if result[field.name]
                    result[field.name].push field.value
                else
                    result[field.name] = [field.value]
        result
    
    flattenFieldsWithSingleValue = ->
        result = {}
        for name, value in groupByName()
            if value.length == 1
                result[name] = value[0]
            else
                result[name] = value
        result
    
    flattenFieldsWithSingleValue()
```

It works, but looks ugly and complex.

Now look to implementation with underscore.js and destructuring arguments:

```coffeescript
transform = (serializedForm) ->
    _.chain serializedForm
     .reject ({name, value}) ->
        value == '' or name == 'csrfmiddlewaretoken'
     .groupBy 'name'
     .map (vals, name) ->
        vals = _.map(vals, ({value}) -> value)
        [name, if vals.length > 1 then vals else vals[0]]
     .object()
     .value()
```

A lot better I think. Less lines of code, each transformation step can be simple
separated from each other. And all this because of fluent interface presented by
underscore.js `_.chain` and destructuring arguments.
