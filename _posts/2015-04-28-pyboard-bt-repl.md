---
layout:     post
title:      "REPL driven development on pyboard"
date:       2015-04-28 01:42:00
keywords:   python, pyboard
---

All heard the stories about Smalltalk and LISP apps which worked for
decades and was developed/updated via REPL (or similar), so why don't
do something similar on microcontroller board?

On pyboard we have a REPL, but we can't run it and code on pyboard
concurrently, so first of all we need to develop simple REPL with which we can do it.
And for making it more interesting &ndash; make this REPL to work through
bluetooth:
 
```python
from pyb import UART

uart = UART(1)
uart.init(115200)


def exec_command(command):
    """Runs command and returns output for REPL."""
    try:
        return eval(command)
    except SyntaxError:
        try:
            # For stuff like `a = 10`:
            return exec(command)
        except Exception as e:
            return e
    except Exception as e:
        return e


def handle_repl():
    """Tries to read command from uart and exec it."""
    command = uart.read().decode()
    if command:
        result = exec_command(command)
        if result is not None:
            uart.write('{}\n'.format(result))


def iteration():
    """Function for overriding.""


while True:
    handle_repl()
    iteration()
```

So now we can test it:

```bash
➜ echo "1 + 1" > /dev/rfcomm1
➜ head -n 1 /dev/rfcomm1
2
```

It works, so let's try to override `iteration` for sending `Hello World!`
on each iteration to us through bluetooth:

```bash
➜ echo "globals()['iteration'] = lambda: uart.write('Hello World\n')" > /dev/rfcomm1
➜ cat /dev/rfcomm1
Hello World
Hello World
^C%  
```

Or we can do something more practical &ndash; send measurements from
accel sensors:

```bash
➜ echo "from pyb import Accel

def _send_accel():
    accel = Accel()
    xyz = accel.filtered_xyz()
    uart.write('{}\n'.format(xyz))
    
globals()['iteration'] = _send_accel" > /dev/rfcomm1
➜ cat /dev/rfcomm1    
(9, -6, 90)
(7, -4, 91)
(6, -5, 91)
(5, -4, 92)
^C%
```

That's not all, we can also modify the way that REPL works,
for example &ndash; display all REPL commands/results on
little screen ([ssd1306 module](https://gist.github.com/nvbn/ef690c341dcea667ec8b)):

```bash
➜ echo "from ssd1306 import Display

display = Display(pinout={'sda': 'Y10',
                          'scl': 'Y9'},
                  height=64,
                  external_vcc=False)

orig = exec_command

def wrapper(command):
    display.write('>>> {}'.format(command))
    result = orig(command)
    if result is not None:
        display.write('{}\n'.format(result))
    return result

globals()['exec_command'] = wrapper" > /dev/rfcomm1
➜ echo "a = 1" > /dev/rfcomm1
➜ echo "b = 2" > /dev/rfcomm1
➜ echo "a + b" > /dev/rfcomm1
➜ echo "[x ** 2 for x in range(a + b)]" > /dev/rfcomm1 
```

And it works:

![photo](/assets/pyboard_bt_repl.jpg)

So it's cool and maybe can be useful for developing/updating some
hard-to-reach devices.
