---
layout:     post
title:      "AST transformations with __future__-like module"
date:       2016-08-17 08:00:00
keywords:   python
---

In [the previous article](/2016/08/09/partial-piping-ast/) I wrote how-to add partial application with `...`
and piping with `@` using AST transformations. However we needed to
transform AST manually. For automatizing it I planned to use [macropy](https://github.com/lihaoyi/macropy)
but it doesn't work with Python 3 and a bit too complicated. So I ended up with
an idea to create `__transformers__` module that work in a similar way with Python's
`__future__` module. So code will look like:

~~~python
from __transformers__ import ellipsis_partial, matmul_pipe


range(10) @ map(lambda x: x ** 2, ...) @ list @ print
~~~

So first of all for implementing it we need to extract enabled transformers names
from code, it's easy with `ast.NodeVisitor`, we just process all `ImportForm` nodes:

~~~python
import ast


class NodeVisitor(ast.NodeVisitor):
    def __init__(self):
        self._found = []

    def visit_ImportFrom(self, node):
        if node.module == '__transformers__':
            self._found += [name.name for name in node.names]

    @classmethod
    def get_transformers(cls, tree):
        visitor = cls()
        visitor.visit(tree)
        return visitor._found
~~~

Let's run it:

~~~python
tree = ast.parse(code)

>>> print(NodeVisitor.get_transformers(tree))
['ellipsis_partial', 'matmul_pipe']
~~~

Next step is to define transformers. Transformer is just a Python module
with `transformer` variable, that is instance of `ast.NodeTransformer`.
For example transformer module for piping with matrix multiplication operator
will be like:

~~~python
import ast


class MatMulPipeTransformer(ast.NodeTransformer):
    def _replace_with_call(self, node):
        """Call right part of operation with left part as an argument."""
        return ast.Call(func=node.right, args=[node.left], keywords=[])

    def visit_BinOp(self, node):
        if isinstance(node.op, ast.MatMult):
            node = self._replace_with_call(node)
            node = ast.fix_missing_locations(node)

        return self.generic_visit(node)


transformer = MatMulPipeTransformer()
~~~

Now we can write function that extracts used transformers, imports and applies it to AST:

~~~python
def transform(tree):
    transformers = NodeVisitor.get_transformers(tree)

    for module_name in transformers:
        module = import_module('__transformers__.{}'.format(module_name))
        tree = module.transformer.visit(tree)

    return tree
~~~

And use it on our code:

~~~python
from astunparse import unparse

>>> unparse(transform(tree))
from __transformers__ import ellipsis_partial, matmul_pipe
print(list((lambda __ellipsis_partial_arg_0: map((lambda x: (x ** 2)), __ellipsis_partial_arg_0))(range(10)))
~~~

Next part is to automatically apply transformations on module import, for that we need to 
implement custom `Finder` and `Loader`. `Finder` is almost similar with 
`PathFinder`, we just need to replace `Loader` with ours in `spec`. And
`Loader` is almost `SourceFileLoader`, but we need to run our transformations
in `source_to_code` method:

~~~python
from importlib.machinery import PathFinder, SourceFileLoader


class Finder(PathFinder):
    @classmethod
    def find_spec(cls, fullname, path=None, target=None):
        spec = super(Finder, cls).find_spec(fullname, path, target)
        if spec is None:
            return None

        spec.loader = Loader(spec.loader.name, spec.loader.path)
        return spec


class Loader(SourceFileLoader):
    def source_to_code(self, data, path, *, _optimize=-1):
        tree = ast.parse(data)
        tree = transform(tree)
        return compile(tree, path, 'exec',
                       dont_inherit=True, optimize=_optimize)
~~~


Then we need to put our finder in `sys.meta_path`:

~~~python
import sys

def setup():
    sys.meta_path.insert(0, Finder)
    
setup()
~~~

And now we can just import modules that use transformers. But it requires
some bootstrapping.

We can make it easier by creating `__main__` module that will register module
finder and run module or file:

~~~python
from runpy import run_module
from pathlib import Path
import sys
from . import setup

setup()

del sys.argv[0]

if sys.argv[0] == '-m':
    del sys.argv[0]
    run_module(sys.argv[0])
else:
    # rnupy.run_path ignores meta_path for first import
    path = Path(sys.argv[0]).parent.as_posix()
    module_name = Path(sys.argv[0]).name[:-3]
    sys.path.insert(0, path)
    run_module(module_name)
~~~

So now we can run our module easily:

~~~bash
➜ python -m __transformers__ -m test   
[0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

➜ python -m __transformers__ test.py                 
[0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
~~~

And that's all, you can try transformers by yourself with `transformers` package:

~~~bash
pip install transformers
~~~

[Source code on github](https://github.com/nvbn/__transformers__), [package](https://pypi.python.org/pypi/transformers), [previous part](/2016/08/09/partial-piping-ast/).
