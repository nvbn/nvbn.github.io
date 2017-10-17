---
layout:     post
title:      "Change iTerm2 tab and window title colors depending on ssh host"
date:       2017-10-11 22:30:00
keywords:   iterm2, macos, python
image:      /assets/iterm2_ssh_color.png
---

At my work, I use macOS with iTerm2 as a terminal. And iTerm2 has
fancy escape codes for changing tab and window titles colors:

~~~bash
\033]6;1;bg;red;brightness;255\a
\033]6;1;bg;green;brightness;255\a
\033]6;1;bg;blue;brightness;255\a
~~~

So I thought that it will be nice to distinguish different ssh
hosts by color. I found on
[Stack Overflow](https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript)
how to generate color from a string and wrote a python script that
extracts host from command line arguments and prints fancy sequences:

~~~python
#!/usr/bin/python

import sys


def get_host():
    for arg in sys.argv[1:]:
        if not arg.startswith('-'):
            return arg


def str_to_color(s):
    hash = 0
    for c in s:
        hash = ord(c) + ((hash << 5) - hash)

    for i in range(3):
        yield (hash >> (i * 8)) & 0xff


def generate_seqs(color):
    seq = '\033]6;1;bg;{};brightness;{}\a'
    names = ['red', 'green', 'blue']
    for name, v in zip(names, color):
        yield seq.format(name, v)


if __name__ == '__main__':
    host = get_host()
    if host:
        color = str_to_color(host)
        for seq in generate_seqs(color):
            sys.stdout.write(seq)
~~~

In action:

~~~bash
➜ ./ssh_color.py mrw.wtf
]6;1;bg;red;brightness;173]6;1;bg;green;brightness;84]6;1;bg;blue;brightness;51
~~~

Now we need to create a bash/zsh function that will call our script,
run `ssh` and reset color on exit: 

~~~bash
ssh_color () {
    ssh_color.py $*  # I put script in /usr/local/bin/
    trap 'echo -e "\033]6;1;bg;*;default\a"' INT EXIT
    ssh $*
}

alias ssh=ssh_color
~~~

And it just works:

![screenshot](/assets/iterm2_ssh_color.png)
