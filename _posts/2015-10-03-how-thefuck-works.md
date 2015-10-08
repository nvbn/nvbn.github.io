---
layout:     post
title:      "How The Fuck works"
date:       2015-10-08 17:25:00
keywords:   python, thefuck
---

<div style='background: #300a24; padding: 10px; margin-bottom: 10px;'><img src='/assets/thefuck.png' /></div>

Not so long ago I introduced an useful app [The Fuck](https://github.com/nvbn/thefuck)
that fixes the previous console command.
It was downloaded thousands times, got tons of stars on github, had tens
of great contributors. And it's interesting inside.

Also about a week ago I discussed about [The Architecture of Open Source Applications books](http://aosabook.org/en/index.html).
And now I think it'll be cool to write something like a chapter
in the book, but about The Fuck.

### Pipeline

The simplest abstraction for describing the app is a pipeline,
from the user side it looks like just:

<div class="mermaid">
graph LR
    A[Something goes wrong]-->B[fuck]
    B-->C[All cool]
</div>

It's that simple because `fuck` (or whatever user uses) is an alias, it does
some magic for getting the broken command, executing fixed command and
updating the history.
For example for zsh it looks like:

```bash
TF_ALIAS=fuck alias fuck='eval $(thefuck $(fc -ln -1 | tail -n 1)); fc -R'
```

Back to pipeline, for `thefuck` that runs inside the alias it'll be:

<div class="mermaid">
graph LR
    A[Broken command]-->B[thefuck]
    B-->C[Fixed command]
</div>

And all interesting stuff happens inside of `thefuck`:

<div class="mermaid">
graph TB
    A[Broken command]-->B[Matched rules]
    B-->C[Corrected commands]
    C-->|User selects one|D[Fixed command]
</div>

Most significant part here is matching rules, rule is a special
modules with two functions:
 
 - `match(command: Command) -> bool` &ndash; should return `True` when rule matched;
 - `get_new_command(command: Command) -> str|list[str]` &ndash; should return fixed
 command or list of fixed commands.
 
I guess the app is cool only because of the rules. And it's very simple
to write your own and now 75 rules available, written
mostly by third party contributors.
 
`Command` is a special data structure that works almost like
namedtuple `Command(script: str, stdout: str, stderr: str)`
where `script` is a shell-agnostic version of broken command.

### Shell specific

All shells have different ways to describe aliases, different syntax (like `and`
instead of `&&` in `fish`) and different ways to work with history.
And even it depends on shell configs (`.bashrc`,
`.zshrc`, etc). For avoiding all this stuff a special `shells` module converts
shell specific command to `sh` compatible version, expands aliases and environment
variables.

So for obtaining mentioned in the previous section
`Command` instance we using special `shells.from_shell` function, 
run result in `sh`, and obtain `stdout` and `stderr`:

<div class="mermaid">
graph TB
    A[Broken command]-->|from_shell|B[Shell agnostic command]
    B-->|Run in sh|C[Command instance]
</div>

And also we making some similar step with fixed command &ndash; convert
shell agnostic command to shell specific with `shells.to_shell`.

### Settings

The Fuck is very configurable app, user can enable/disable rules,
configure ui, set rules specific options and etc. As a config app uses special
`~/.thefuck/settings.py` module and environment variables:

<div class="mermaid">
graph TB
    A[Default settings]-->B[Updated from settings.py]
    B-->C[Updated from env]
</div>

Originally settings object was passed to every place where it was
needed as an argument, it was cool and testable, but too much boilerplate.
Now it's a singleton and works like `django.conf.settings` (`thefuck.conf.settings`).

### UI

UI part of The Fuck is very simple, it allows to chose from variants of
corrected commands with arrows, approve selection with `Enter` or
dismiss it with `Ctrl+C`.

Downfall here is that there's no function in Python standard library
for reading key on non-windows and without curses. And we can't use
curses here because of alias specifics. But it's easy to
write clone of windows-specific `msvrt.getch`:

```python
import tty
import termios


def getch():
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        if ch == '\x03':  # For compatibility with msvcrt.getch
            raise KeyboardInterrupt
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
```

Also UI requires properly sorted list of corrected commands, so
all rules should be matched before and it can took a long time.
But with simple heuristic it works well, first of all we
match rules in order of it's priority. So the first corrected command
returned by the first matched rule is definitely the command
with max priority. And app matches other rules only when user presses
arrow keys for selecting another. So for most use cases it work's fast.

### In wide

If we look to the app in wide, it's very simple:

<div class="mermaid">
graph TB
    A[Controller]-->E[Settings]
    A-->B[Shells]
    A-->C[Corrector]
    C-->D[Rules]
    C-->E
    D-->E
    A-->F[UI]
</div>

Where `controller` is an entry point, that used when user use `thefuck broken-command`.
It initialises `settings`, prepares command from/to shell with `shells`,
gets corrected commands from `corrector` and selects one with `UI`.

`Corrector` matches all enabled rules against current command
and returns all available corrected variants.
 
About `UI`, `settings` and `rules` you can read above.

### Testing

Tests is one of the most important parts of any software project, without them
it'll fall apart on every change. For unit tests here's used
[pytest](http://pytest.org/). Because of rules there's a lot
of tests for matching and checking corrected command, so
parametrized tests is very useful, typical test looks like:

```python
import pytest
from thefuck.rules.cd_mkdir import match, get_new_command
from tests.utils import Command


@pytest.mark.parametrize('command', [
    Command(script='cd foo', stderr='cd: foo: No such file or directory'),
    Command(script='cd foo/bar/baz',
            stderr='cd: foo: No such file or directory'),
    Command(script='cd foo/bar/baz', stderr='cd: can\'t cd to foo/bar/baz')])
def test_match(command):
    assert match(command)
```

Also The Fuck works with various amount of shells and every shell
requires specific aliases. And for testing that all works we need functional
tests, there's used my [pytest-docker-pexpect](https://github.com/nvbn/pytest-docker-pexpect),
that run's special *scenarios* with every supported shell inside docker containers.

### Distribution

The most problematic part of The Fuck is installation of it by users. The app
distributed with pip and we had a few problems:

* some dependencies on some platforms needs python headers (`python-dev`),
so we need to tell users manually install it;
* pip doesn't support post-install hooks, so users need to manually
configure an alias;
* some users uses non-supported python versions, only 2.7 and 3.3+ supported;
* some old versions of pip doesn't install any dependency at all;
* some versions of pip ignores python version dependent dependencies, we need `pathlib` only for python older than 3.4;
* that's funny, but someone was pissed off because of the name and [tried to remove
package from pypi](http://sourceforge.net/p/pypi/support-requests/490/).

Most of this problems was fixed by using [special install script](https://github.com/nvbn/thefuck/blob/master/install.sh),
it uses `pip` inside, but prepares system before installation
and configures an alias after.
