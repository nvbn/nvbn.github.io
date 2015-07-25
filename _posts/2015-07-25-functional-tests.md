---
layout:     post
title:      "Functional testing of console apps with Docker"
date:       2015-07-25 19:53:00
keywords:   python, docker, pytest
---

For [one of my apps](https://github.com/nvbn/thefuck) I'd been manually testing some
basic functions in a bunch of environments, and it was a huge pain. So I
decided to automatize it. As a simplest solution I chose to run an environment
in [Docker](https://www.docker.com/) and interact with them through
[pexpect](https://github.com/pexpect/pexpect).

First of all I tried to use [docker-py](https://github.com/docker/docker-py),
but it's almost impossible to interact with app run in Docker container,
started from docker-py with pexpect. So I just used Docker binary:

```python
from contextlib import contextmanager
import subprocess
import shutil
from tempfile import mkdtemp
from pathlib import Path
import sys
import pexpect

# Absolute path to your source root:
root = str(Path(__file__).parent.parent.parent.resolve())


def _build_container(tag, dockerfile):
    """Creates a temporary folder with Dockerfile, builds an image and
    removes the folder.
    
    """
    tmpdir = mkdtemp()
    with Path(tmpdir).joinpath('Dockerfile').open('w') as file:
        file.write(dockerfile)
    if subprocess.call(['docker', 'build', '--tag={}'.format(tag), tmpdir],
                       cwd=root) != 0:
        raise Exception("Can't build a container")
    shutil.rmtree(tmpdir)


@contextmanager
def spawn(tag, dockerfile, cmd):
    """Yields spawn object for `cmd` ran inside a Docker container with an
    image build with `tag` and `dockerfile`. Source root is available in `/src`.
    
    """
    _build_container(tag, dockerfile)
    proc = pexpect.spawnu('docker run --volume {}:/src --tty=true '
                          '--interactive=true {} {}'.format(root, tag, cmd))
    proc.logfile = sys.stdout

    try:
        yield proc
    finally:
        proc.terminate()

```

`_build_container` is a bit tricky, but it's because Docker binary can build an image
only for file named `Dockerfile`.

This code can be used for running something inside a Docker container very simple,
code for printing content of your source root inside the container will be:

```python
with spawn(u'ubuntu-test', u'FROM ubuntu:latest', u'bash') as proc:
    proc.sendline(u'ls /src')
```


Back to testing, if we want to test that some application can
print version, you can easily write [py.test](http://pytest.org/latest/) test
like this:

```python
container = (u'ubuntu-python', u'''
FROM ubuntu:latest
RUN apt-get update
RUN apt-get install -yy python
''')


def test_version():
    """Ensure that app can print current version."""
    with spawn(*container, u'bash') as proc:
        proc.sendline(u'cd /src')
        proc.sendline(u'pip install .')
        proc.sendline(u'app --version')
        # Checks that `version:` is in the output:
        assert proc.expect([pexpect.TIMEOUT, u'version:'])
```

You can notice the strange `assert proc.expect([pexpect.TIMEOUT, u'version:'])` construction,
it works very simple, if there's `version:` in output, `expect` returns `1`, if timeout
came first - `0`.

Also you can notice that all strings are in unicode (`u''`), it's for compatibility
with Python 2. If you use only Python 3, you can remove all `u''`.

[Examples.](https://github.com/nvbn/thefuck/tree/master/tests/functional)
