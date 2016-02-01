---
layout:     post
title:      Serving static using nginx with docker
date:       2015-01-25 03:35:00
keywords:   docker, nginx
---

Imagine common situation when we have a container with a web application and a container
with nginx, and we want to serve the web app static using nginx. Sounds very
simple but actually it isn't.

Before I start, source code of the simple web application which I want to run inside a container:

~~~python
from flask import Flask, url_for

app = Flask(__name__)

@app.route("/")
def main():
    return '''<h1>Hello world!</h1>
              <img src='{}' />'''.format(url_for('static', filename='image.png'))

if __name__ == '__main__':
    app.run(host='0.0.0.0')
~~~
And also for proper work of this app there should be image in `static/image.png`.

Back to the task, **the first idea &ndash; put static in a volume**. So `Dockerfile` for
the application should be like this:

~~~dockerfile
FROM python:3.4
EXPOSE 5000
VOLUME static
COPY . .
RUN pip install flask
ENTRYPOINT python main.py
~~~

It's simple to build and to test:

~~~bash
docker build -t example/app .
docker run -p 5000:5000 --name app example/app
~~~

After that you can visit [localhost:5000](http://localhost:5000) and ensure
that app works.

Now go to the container for nginx. First of all we should write config for nginx:

~~~nginx
upstream app_upstream {
  server app:5000;
}

server {
  listen 80;

  location /static {
    alias /static;
  }

  location / {
    proxy_pass  http://app_upstream;
  }
}
~~~

And `Dockerfile` for it:

~~~dockerfile
FROM nginx:1.7
RUN rm /etc/nginx/conf.d/*
COPY app.conf /etc/nginx/conf.d/
~~~

So now we can build and run nginx:

~~~bash
docker build -t example/nginx .
docker run -p 8080:80 --link app:app --volumes-from app example/nginx
~~~

And it works! You can visit [localhost:8080](http://localhost:8080) for ensuring.
But actually it don't &ndash; it'll be not that cool if we want to scale this web app.
There will be one container with static and web app and also `n` containers with just a web app.

So, **the second idea &ndash; create a data volume container with static**.
`Dockerfile` for it:

~~~dockerfile
FROM ubuntu:14.04
VOLUME static
COPY . static
~~~

And now we should build it, run it and restart nginx container:

~~~bash
docker build -t example/static .
docker run --name static example/static
docker run -p 8080:80 --link app:app --volumes-from static example/nginx
~~~

This variant works great, but isn't it too complex? Maybe there is a more simpler solution?
And probably it exists.

And, **the third idea &ndash; just cache static in nginx**.
So we should update nginx config to something like this:

~~~nginx
proxy_cache_path /tmp/cache levels=1:2 keys_zone=cache:30m max_size=1G;

upstream app_upstream {
  server app:5000;
}

server {
  listen 80;

  location /static {
    proxy_cache cache;
    proxy_cache_valid 30m;
    proxy_pass  http://app_upstream;
  }

  location / {
    proxy_pass  http://app_upstream;
  }
}
~~~

And `Dockerfile` for nginx to:

~~~dockerfile
FROM nginx:1.7
RUN mkdir /tmp/cache
RUN chown www-data /tmp/cache
RUN rm /etc/nginx/conf.d/*
COPY app.conf /etc/nginx/conf.d/
~~~

So now we can build it and run it:

~~~bash
docker build -t example/nginx .
docker run -p 8080:80 --link app:app example/nginx
~~~

It works well and it's very simple, for my projects I've chosen that solution.
But it has one drawback &ndash; for updating static we should wait 30 minutes
or we should restart nginx container.
