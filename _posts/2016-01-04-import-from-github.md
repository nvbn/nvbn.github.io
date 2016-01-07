---
layout:     post
title:      "Import python modules straight from github"
date:       2016-01-04 17:25:00
keywords:   python, github
---

In Go we have ability to import modules from github, like:

```go
import "github.com/parnurzeal/gorequest"
```

It's a bit controversial feature, but sometimes it's useful. And I
was interested, is it possible to implement something like that in python. **TLDR**
it's possible with [import\_from\_github\_com](https://github.com/nvbn/import_from_github_com)
package:

```python
from github_com.kennethreitz import requests

assert requests.get('https://github.com').status_code == 200
```

So, how it works, according to [PEP-0302](https://www.python.org/dev/peps/pep-0302/)
we have special `sys.meta_path` with importer objects and every importer
should implement finder protocol with `find_module(module_name: str, package_path: [str]) -> Loader|None`.
Now we need to implement finder that handles modules, 
which path starts with `github_com`, like:

```python
class GithubComFinder:
    def find_module(self, module_name, package_path):
        if module_name.startswith('github_com'):
            return GithubComLoader()
            
sys.meta_path.append(GithubComFinder())
```

And now we need `GithubComLoader` that implements loader protocol with `load_module(fullname: str) -> None`,
I'll skip private methods of the loader here, they're straightforward and not interesting in 
context of the article:

```python
class GithubComLoader:
    def load_module(self, fullname):
        if self._is_repository_path(fullname):
            self._install_module(fullname)

        if self._is_intermediate_path(fullname):
            module = IntermediateModule(fullname)
        else:
            module = self._import_module(fullname)

        sys.modules[fullname] = module
```

So what's `IntermediateModule`, it's a dummy module/package for paths like `github_com.nvbn`,
it's used only in intermediate steps and shouldn't be used by end user. Installation happens in
`_install_module` method, it just calls `pip` with git url, like:

```python
import pip

pip.main(['install', 'git+https://github.com/kennethreitz/requests'])
```

All looks very simple, let's try it in action:

```python
>>> from github_com.kennethreitz import requests
Collecting git+https://github.com/kennethreitz/requests
  Cloning https://github.com/kennethreitz/requests to /tmp/pip-8yyvh7kr-build
Installing collected packages: requests
  Running setup.py install for requests
Successfully installed requests-2.9.1
>>> requests.get('https://github.com').status_code
200
```

[Sources on github.](https://github.com/nvbn/import_from_github_com)
