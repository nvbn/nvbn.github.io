---
layout:     post
title:      "Changing version of App Engine application on checkout to a git branch"
date:       2015-07-18 22:51:00
keywords:   git, gae
---

It's very common and useful to use current branch name (or something dependent on it)
as a version for App Engine application. And it's painful and error-prone to
change it manually.

It's easily can be automatized with a git hook, we just need to fill `.git/hooks/post-checkout`
with something like:

```python
#!/usr/bin/env python
import glob
import subprocess


def get_yaml_paths():
    """Returns all `.yaml` files where `version` can be changed."""
    for path in glob.glob('*.yaml'):
        with open(path) as yml:
            content = yml.read()
            if 'version:' in content:
                yield path


def get_version():
    """Returns `version`, currently just current branch."""
    proc = subprocess.Popen(['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                            stdout=subprocess.PIPE)
    return proc.stdout.read()


def replace_version(path, new_version):
    with open(path, 'r') as yml:
        lines = yml.readlines()
    with open(path, 'w') as yml:
        for line in lines:
            if line.startswith('version'):
                yml.write('version: {}\n'.format(new_version))
            else:
                yml.write(line)


version = get_version()
print("Change version in yaml files to", version)
for path in get_yaml_paths():
    replace_version(path, version)

```

And make it executable:

```bash
chmod +x .git/hooks/post-checkout
```

In action:

```bash
➜ cat app.yaml | grep "^version:"
version: fixes
➜ git checkout feature
Switched to branch 'feature'
Your branch is up-to-date with 'origin/feature'.
Change version in yaml files to feature
➜ cat app.yaml | grep "^version:"
version: feature
```
