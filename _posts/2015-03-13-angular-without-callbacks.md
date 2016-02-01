---
layout:     post
title:      "Writing angularjs code without callbacks"
date:       2015-03-13 14:22:00
keywords:   javascript, angularjs, coffeescript
---

Before I start I need to notice that in this article I'll use
CoffeeScript instead of JavaScript, because syntax of
JS generators is too bloated, especially with decorators and
inside of some functions:

~~~javascript
function(){
    return gen(function*(){
        yield something;
    });
}
~~~

From the other side syntax of CoffeeScript generators is neat:

~~~coffeescript
-> gen ->
    yield something
~~~

But all code examples can be translated to JavaScript as-is.

Few weeks ago I wrote a little library &ndash; [ng-gen](https://github.com/nvbn/ng-gen),
it's designed to use power of generators with angularjs, and it'll be used
in this article.

Imagine simple controller code where we need to get data from few
http resources and assigne it to the `$scope`:

~~~coffeescript
.controller 'main', ($scope, $http) ->
  $http.get('/tags/').then ({data}) ->
    $scope.tags = data
  , ({data}) ->
    $scope.tagsError = "Couldn't fetch tags: #{data}"

  $scope.fetchPhotos = (tag) ->
    $http.get('/photos/?tag=#{tag}').then ({data}) ->
      $scope.photos = data
    , ({data}) ->
      $scope.photosError = "Couldn't fetch photos: #{data}"

  $scope.fetchPhotos()
~~~

Let's try to rewrite it with `ng-gen`:

~~~coffeescript
.controller 'main', ($scope, $http, mainGen, gen) -> mainGen ->  # 1
  try
    $scope.tags = (yield $http.get '/tags/').data  # 2
  catch {data: err}   # 3
    $scope.tagsError = "Couldn't fetch tags: #{err}"

  $scope.fetchPhotos = (tag) -> gen ->  # 4
    try
      $scope.photos = (yield $http.get '/photos/?tag=#{tag}').data
    catch {data: err}
      $scope.photosError = "Couldn't fetch photos: #{err}"

  yield $scope.fetchPhotos()
~~~

I think it looks simpler and reads like imperative code in python or other
familiar languages.

So, what happens in this code sample:

1. Calls `mainGen` on the generator, it processes all received promises from
the generator. When generator inside `mainGen` fails, `mainGen`
propagates exception.
2. Yields promise, and returns the first argument of success branch of the promise,
in code with promises it's something like this:
`promise.then (response) -> $scope.tags = response.data`
3. When yielded promise fails, `mainGen` throws an exception,
in code with promises it'll be:
`proomise.then (->), (err) -> $scope.tagsError = "Couldn't fetch tags: #{err}"`
4. Creates a function which calls `gen` on generator. Difference between
`mainGen` and `gen`, is that `gen` returns a promise.

But what if we want to create a service for getting tags. And in the service
we need to retry request five times on error, first let's
create it without generators:

~~~coffeescript
.constant 'retryCount', 5

.constant 'retryTimeout', 500

.factory 'Tags', ($http, $q, $timeout, retryCount, retryDelay) ->
  all: -> $q (resolve, reject) ->  # 1
    makeRequest = (errorsCount=0) ->  # 2
      $http.get('/tags/').then ({data})
        resolve data.map ({name}) -> name  # 3
      , ({data}) ->
        if errorsCount <= retryCount
          timeout (-> makeRequest errorsCount + 1), retryDelay  # 4
        else
          reject data  # 5

    makeRequest()

.controller 'main', ($scope, $http, mainGen, gen, Tags) -> mainGen ->
  try
    $scope.tags = yield Tags.all()  # 6
  catch {data: err}
    $scope.tagsError = "Couldn't fetch tags: #{err}"

  $scope.fetchPhotos = (tag) -> gen ->
    try
      $scope.photos = (yield $http.get '/photos/?tag=#{tag}').data
    catch {data: err}
      $scope.photosError = "Couldn't fetch photos: #{err}"

  yield $scope.fetchPhotos()
~~~

Wow, this service looks too complex, and what happens here:

1. Creates a function which creates a new promise.
2. Creates a helper function for making request to server.
3. When request succeed &ndash; resolves the promise.
4. When failed and errors count lower or equal to the maximum retries count
&ndash; waits a few seconds and tries again with increased counter.
5. When higher &ndash; rejects the promise with error.
6. Gets tags using the service.

Let's try to rewrite this pain to generators, all code except
the service stay the same:

~~~coffeescript
.factory 'Tags', ($http, gen, wait, retryCount, retryDelay) ->
  all: -> gen ->
    for errorsCount in [0..retryCount]
      try
        response = yield $http.get '/tags/'
        return response.data.map ({name}) -> name  # 1
      catch {data: err}
        yield wait retryDelay  # 2
    throw err  # 3
~~~

Isn't it a lot simpler, more readable and more flat?
What happens here:

1. Stops the generator on first success result, with `gen` it
equals to `resolve` call.
2. Waits a few milliseconds, `wait` is a part of `ng-gen` and
works like `timeout`, but more useful with generators.
3. Throws error when all retries reached, with `gen` it equals
to `reject` call.

It's all cool, but generators isn't a silver bullet, currently we can use generators
only in latest versions of Chrome and Firefox,
or with translators like [Babel](https://babeljs.io/),
with which we can use generators with some limitation. For example,
we can't run code like this in browsers without native support of
generators:

~~~coffeescript
while True
  $scope.posts = (yield $http.get '/posts/').data
  yield wait 5000
~~~

Additional links: [ng-gen](https://github.com/nvbn/ng-gen), [JavaScript samples](https://github.com/nvbn/ng-gen/blob/master/example/public/app.js).
