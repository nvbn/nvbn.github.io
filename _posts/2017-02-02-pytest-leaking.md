---
layout:     post
title:      "Finding leaking tests with pytest"
date:       2017-02-02 10:00:00
keywords:   python, pytest
---

On one project we had a problem with leaking tests, and problem was so huge
that some tests was leaking even
for a few GB. We tried [pytest-leaks](https://github.com/abalkin/pytest-leaks), but
it was a bit overkill and didn't work withed our python version. So we wrote a little
leak detector by ourselves.

First of all we got consumed RAM with [psutil](https://github.com/giampaolo/psutil):

~~~python
import os
from psutil import Process

_proc = Process(os.getpid())


def get_consumed_ram():
    return _proc.memory_info().rss
~~~

Then created some log of ram usage, where `nodeid` is a special pytest representation of test,
like `tests/test_service.py::TestRemoteService::test_connection`:

~~~python
from collections import namedtuple

START = 'START'
END = 'END'
ConsumedRamLogEntry = namedtuple('ConsumedRamLogEntry', ('nodeid', 'on', 'consumed_ram'))
consumed_ram_log = []
~~~

And logged ram usage from pytest hooks, which we just put in `conftest.py`:

~~~python
def pytest_runtest_setup(item):
    log_entry = ConsumedRamLogEntry(item.nodeid, START, get_consumed_ram())
    consumed_ram_log.append(log_entry)


def pytest_runtest_teardown(item):
    log_entry = ConsumedRamLogEntry(item.nodeid, END, get_consumed_ram())
    consumed_ram_log.append(log_entry)
~~~

Pytest calls `pytest_runtest_setup` before each test, and `pytest_runtest_teardown`
after.

And after all tests we print information about tests
leaked more than allowed (10MB in our case) from
`pytest_terminal_summary` hook:

~~~python
from itertools import groupby

LEAK_LIMIT = 10 * 1024 * 1024


def pytest_terminal_summary(terminalreporter):
    grouped = groupby(consumed_ram_log, lambda entry: entry.nodeid)
    for nodeid, (start_entry, end_entry) in grouped:
        leaked = end_entry.consumed_ram - start_entry.consumed_ram
        if leaked > LEAK_LIMIT:
            terminalreporter.write('LEAKED {}MB in {}\n'.format(
                leaked / 1024 / 1024, nodeid))
~~~

So after running tests we got our leaking tests, like:

~~~
LEAKED 712MB in tests/test_service.py::TestRemoteService::test_connection
~~~
