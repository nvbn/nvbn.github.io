---
layout:     post
title:      "py.test plugin for functional testing with Docker"
date:       2015-09-09 11:15:00
keywords:   python, docker, pytest
---

It's very useful to run functional tests in a clean environment,
like a fresh Docker container, and [I wrote about this before](/2015/07/25/functional-tests/),
and now it was formalized in a simple py.test plugin &mdash; [pytest-docker-pexpect](https://github.com/nvbn/pytest-docker-pexpect).

It provides few useful fixtures:

* `spawnu` &ndash; `pexpect.spawnu` object attached to a container, it can be used
to interact with apps inside the container, [read more](https://pexpect.readthedocs.org/en/latest/api/pexpect.html#pexpect.spawn);
* `TIMEOUT` &ndash; a special object, that can be used in assertions those checks output;
* `run_without_docker` &ndash; indicates that tests running without Docker, when
py.test called with `--run-without-docker`.

And some marks:

* `skip_without_docker` &ndash; skips test when without Docker;
* `once_without_docker` &ndash; runs parametrized test only with a first set of
params when without Docker.

It's easier to show it in examples. So, first of all, just test some app `--version`
argument inside an Ubuntu container:

```python
import pytest


@pytest.fixture
def ubuntu(spawnu):
    # Get `spawnu` attached to ubuntu container with installed python and
    # where bash ran
    proc = spawnu(u'example/ubuntu',
                  u'''FROM ubuntu:latest
                      RUN apt-get update
                      RUN apt-get install python python-dev python-pip''',
                  u'bash')
    # Sources root is available in `/src`
    proc.sendline(u'pip install /src')
    return proc


def test_version(ubuntu, TIMEOUT):
    ubuntu.sendline(u'app --version')
    # Asserts that `The App 2.9.1` came before timeout,
    # when timeout came first, `expect` returns 0, when app version - 1
    assert ubuntu.expect([TIMEOUT, u'The App 2.9.1'])

```

Looks simple. But sometimes we need to run tests in different environments, for example &mdash;
with different Python versions. It can be easily done by just changing `ubuntu` fixture:

```python
@pytest.fixture(params=[2, 3])
def ubuntu(request, spawnu):
    python_version = request.param
    # Get `spawnu` attached to ubuntu container with installed python and
    # where bash ran
    dockerfile = u'''
        FROM ubuntu:latest
        RUN apt-get update
        RUN apt-get install python{version} python{version}-dev python{version}-pip
    '''.format(version=python_version)
    proc = spawnu(u'example/ubuntu', dockerfile, u'bash')
    # Your source root is available in `/src`
    proc.sendline(u'pip{} install /src'.format(python_version))
    return proc
```

And sometimes we need to run tests in Docker-less environment, for example &mdash;
in [Travis CI container-based infrastructure](http://docs.travis-ci.com/user/workers/container-based-infrastructure/).
So here's where `--run-without-docker` argument comes handy. But we don't need to
run tests for more than one environment in a single Travis CI run, and we don't need
to make some installation steps. So there's place for `once_without_docker`
mark and `run_without_docker` fixture, test with them will be:

```python
import pytest


@pytest.fixture(params=[2, 3])
def ubuntu(request, spawnu, run_without_docker):
    python_version = request.param
    # Get `spawnu` attached to ubuntu container with installed python and
    # where bash ran
    dockerfile = u'''
        FROM ubuntu:latest
        RUN apt-get update
        RUN apt-get install python{version} python{version}-dev python{version}-pip
    '''.format(version=python_version)
    proc = spawnu(u'example/ubuntu', dockerfile, u'bash')
    # It's already installed if we run without Docker:
    if not run_without_docker:
        # Your source root is available in `/src`
        proc.sendline(u'pip{} install /src'.format(python_version))
    return proc


@pytest.mark.once_without_docker
def test_version(ubuntu, TIMEOUT):
    ubuntu.sendline(u'app --version')
    # Asserts that `The App 2.9.1` came before timeout,
    # when timeout came first, `expect` returns 0, when app version - 1
    assert ubuntu.expect([TIMEOUT, u'The App 2.9.1'])

```

Another often requirement &mdash; skip some tests without docker, some destructive tests.
It can be done with `skip_without_docker` mark:

```python
@pytest.mark.skip_without_docker
def test_broke_config(ubuntu, TIMEOUT):
    ubuntu.sendline(u'{invalid} > ~/.app/config.json')
    ubuntu.sendline(u'app')
    assert ubuntu.expect([TIMEOUT, u'Config was broken!'])
```

[Source code of the plugin.](https://github.com/nvbn/pytest-docker-pexpect)
