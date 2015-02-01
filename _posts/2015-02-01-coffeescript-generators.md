---
layout:     post
title:      Async code without callbacks with CoffeeScript generators
date:       2015-02-01 19:33:00
keywords:   coffeescript, generators
---

Sometimes it's very hard to understand code with a bunch of callbacks, even if it with promises.
But in ES6 and in CoffeeScript 1.9 we got generators, so maybe we can avoid
callbacks with them, and use something like
[tornado.gen](http://tornado.readthedocs.org/en/latest/gen.html)?

And we can, let's look at this little helper function:

```coffeescript
gen = (fn) ->
  new Promise (resolve, reject) ->
    generator = fn()

    putInGenerator = (method) -> (val) ->
      try
        handlePromise generator[method](val)
      catch error
        reject error

    handlePromise = ({value, done}) ->
      if done
        resolve value
      else if value and value.then
        value.then putInGenerator('next'), putInGenerator('throw')
      else
        reject "Value isn't a promise!"

    handlePromise generator.next()
```

With it code like:

```coffeescript
$http.get('/users/').then ({data}) ->
  doSomethingWithUsers data.users
  $http.get '/posts/'
, (err) ->
  console.log "Can't receive users", err
.then ({data}) ->
  doSomethingWithPosts data.posts
, (err) ->
  console.log "Can't receive posts", err
```

Can be transformed to something like:

```coffeescript
gen ->
  try
    {data: usersData} = yield $http.get '/users/'
  catch err
    console.log "Can't receive users", err
    return
  doSomethingWithUsers usersData.users

  try
    {data: postsData} = yield $http.get '/posts/'
  catch err
    console.log "Can't receive posts", err
    return
  doSomethingWithPosts postsData.posts
```

Isn't it cool? But more, result of `gen` is a promise, so we can write something like:

```coffeescript
getUsers = (url) -> gen ->
  {data: {users}} = yield $http.get(url)
  users.map prepareUser

getPosts = (url) -> gen ->
  {data: {posts}} = yield $http.get(url)
  posts.map preparePosts

gen ->
  try
    users = yield getUsers '/users/'
    posts = yield getPosts '/posts/'
  catch err
    console.log "Something goes wrong", err
    return

   doSomethingWithUsers users
   doSomethingWithPosts posts
```

So, what `gen` do:

1. Creates main promise, which will be returned from `gen`.
2. Sends nothing to generator and receives first promise.
3. If promise succeed, sends result of this promise to the generator. If failed &mdash;
throws an error to the generator.
If we got an exception during `.next` or `.throw` &mdash; rejects main promise with that exception.
4. Receives new value from the generator, if the generator is `done` &mdash;
resolves main promise with received value, if the value is a promise &mdash;
repeats the third step, otherwise &mdash; rejects main promise.
