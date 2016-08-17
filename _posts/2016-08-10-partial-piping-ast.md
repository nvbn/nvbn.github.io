---
layout:     post
title:      "Partial application and piping with AST transformation"
date:       2016-08-09 16:00:00
keywords:   python
---

In the [previous article](/2016/08/09/partial-piping/) I wrote about how to
implement partial application and piping using operator overloading and decorators. But we
can use a bit different approach &ndash; AST transformation.

For example we have code:

~~~python
def add(x, y):
    return x + y
    
    
addFive = add(..., 5)

print(addFive(10))
~~~

We can look to AST of this code using [ast](https://docs.python.org/3.5/library/ast.html)
module from standard library and `dump` function from [gist](https://gist.github.com/marsam/d2a5af1563d129bb9482):

~~~python
import ast

code = open('src.py')  # the previous code
tree = ast.parse(code)
print(dump(tree))
~~~

It would be like:

~~~python
Module(body=[
    FunctionDef(name='add', args=arguments(args=[
        arg(arg='x', annotation=None),
        arg(arg='y', annotation=None),
      ], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]), body=[
        Return(value=BinOp(left=Name(id='x', ctx=Load()), op=Add(), right=Name(id='y', ctx=Load()))),
      ], decorator_list=[], returns=None),
    Assign(targets=[
        Name(id='addFive', ctx=Store()),
      ], value=Call(func=Name(id='add', ctx=Load()), args=[
        Ellipsis(),
        Num(n=5),
      ], keywords=[])),
    Expr(value=Call(func=Name(id='print', ctx=Load()), args=[
        Call(func=Name(id='addFive', ctx=Load()), args=[
            Num(n=10),
          ], keywords=[]),
      ], keywords=[])),
  ])
~~~

And we can easily spot call with ellipsis argument:

~~~python
Call(func=Name(id='add', ctx=Load()), args=[
    Ellipsis(),
    Num(n=5),
  ], keywords=[])
~~~

We need to wrap each call with ellipsis in lambda and replace `...`
with the lambda's argument. We can do it with `ast.NodeTransformer`. 
It calls `visit_Call` method for each `Call` node:

~~~python
class EllipsisPartialTransform(ast.NodeTransformer):
    def __init__(self):
        self._counter = 0

    def _get_arg_name(self):
        """Return unique argument name for lambda."""
        try:
            return '__ellipsis_partial_arg_{}'.format(self._counter)
        finally:
            self._counter += 1

    def _is_ellipsis(self, arg):
        return isinstance(arg, ast.Ellipsis)

    def _replace_argument(self, node, arg_name):
        """Replace ellipsis with argument."""
        replacement = ast.Name(id=arg_name,
                               ctx=ast.Load())
        node.args = [replacement if self._is_ellipsis(arg) else arg
                     for arg in node.args]
        return node

    def _wrap_in_lambda(self, node):
        """Wrap call in lambda and replace ellipsis with argument."""
        arg_name = self._get_arg_name()
        node = self._replace_argument(node, arg_name)
        return ast.Lambda(
            args=ast.arguments(args=[ast.arg(arg=arg_name, annotation=None)],
                               vararg=None, kwonlyargs=[], kw_defaults=[],
                               kwarg=None, defaults=[]),
            body=node)

    def visit_Call(self, node):
        if any(self._is_ellipsis(arg) for arg in node.args):
            node = self._wrap_in_lambda(node)
            node = ast.fix_missing_locations(node)

        return self.generic_visit(node)
~~~

So now we can transform AST with `visit` method and dump result:

~~~python
tree = EllipsisPartialTransform().visit(tree)
print(dump(tree))
~~~

And you can see changes:

~~~python
Module(body=[
    FunctionDef(name='add', args=arguments(args=[
        arg(arg='x', annotation=None),
        arg(arg='y', annotation=None),
      ], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]), body=[
        Return(value=BinOp(left=Name(id='x', ctx=Load()), op=Add(), right=Name(id='y', ctx=Load()))),
      ], decorator_list=[], returns=None),
    Assign(targets=[
        Name(id='addFive', ctx=Store()),
      ], value=Lambda(args=arguments(args=[
        arg(arg='__ellipsis_partial_arg_0', annotation=None),
      ], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]), body=Call(func=Name(id='add', ctx=Load()), args=[
        Num(n=5),
        Name(id='__ellipsis_partial_arg_0', ctx=Load()),
      ], keywords=[]))),
    Expr(value=Call(func=Name(id='print', ctx=Load()), args=[
        Call(func=Name(id='addFive', ctx=Load()), args=[
            Num(n=10),
          ], keywords=[]),
      ], keywords=[])),
  ])
~~~

AST is not easy to read, so we can use [astunparse](https://github.com/simonpercivall/astunparse) for transforming
it to source code:

~~~python
from astunparse import unparse

print(unparse(tree))
~~~

Result is a bit ugly, but more readable than AST:

~~~python
def add(x, y):
    return (x + y)
addFive = (lambda __ellipsis_partial_arg_0: add(5, __ellipsis_partial_arg_0))
print(addFive(10))
~~~

For testing result we can compile AST and run it:

~~~python
exec(compile(tree, '<string>', 'exec'))
#  15
~~~

And it's working! Back to piping, for example we have code: 

~~~python
"hello world" @ str.upper @ print
~~~

It's AST would be:

~~~python
Module(body=[
    Expr(value=BinOp(left=BinOp(left=Str(s='hello world'),
                     op=MatMult(),
                     right=Attribute(value=Name(id='str', ctx=Load()), attr='upper', ctx=Load())), 
                                     op=MatMult(),
                                     right=Name(id='print', ctx=Load()))),
  ])
~~~

`BinOp` with `op=MatMult()` is place where we use matrix multiplication operator.
We need to transform it to call of right part with left part as an argument:

~~~python
class MatMulPipeTransformation(ast.NodeTransformer):
    def _replace_with_call(self, node):
        """Call right part of operation with left part as an argument."""
        return ast.Call(func=node.right, args=[node.left], keywords=[])

    def visit_BinOp(self, node):
        if isinstance(node.op, ast.MatMult):
            node = self._replace_with_call(node)
            node = ast.fix_missing_locations(node)

        return self.generic_visit(node)
~~~

Transformed AST would be:

~~~python
Module(body=[
    Expr(value=Call(func=Name(id='print', ctx=Load()), args=[
        Call(func=Attribute(value=Name(id='str', ctx=Load()), attr='upper', ctx=Load()), args=[
            Str(s='hello world'),
          ], keywords=[]),
      ], keywords=[])),
  ])
~~~

And result code is just a nested calls:

~~~python
print(str.upper('hello world'))
#  HELLO WORLD
~~~

So now it's time to combine both transformers. For example we have code:

~~~python
from functools import reduce
import operator

range(100) @ filter(lambda x: x % 2 == 0, ...) \
           @ map(lambda x: x ** 2, ...) \
           @ zip(..., range(200, 250)) \
           @ map(sum, ...) \
           @ reduce(operator.add, ...) \
           @ str.format('result: {}', ...) \
           @ str.upper \
           @ print
~~~

We can transform and run it with:

~~~python
code = open('src.py')  # the previous code
tree = ast.parse(code)

tree = MatMulPipeTransformation().visit(
    EllipsisPartialTransform().visit(tree))
    
exec(compile(tree, '<string>', 'exec'))
~~~

It's working, output as expected is:

~~~python
RESULT: 172925
~~~

However result code is a bit messy:

~~~python
from functools import reduce
import operator
print(str.upper((lambda __ellipsis_partial_arg_5: str.format('result: {}', __ellipsis_partial_arg_5))(
    (lambda __ellipsis_partial_arg_4: reduce(operator.add, __ellipsis_partial_arg_4))(
        (lambda __ellipsis_partial_arg_3: map(sum, __ellipsis_partial_arg_3))(
            (lambda __ellipsis_partial_arg_2: zip(__ellipsis_partial_arg_2, range(200, 250)))(
                (lambda __ellipsis_partial_arg_1: map((lambda x: (x ** 2)), __ellipsis_partial_arg_1))(
                    (lambda __ellipsis_partial_arg_0: filter((lambda x: ((x % 2) == 0)), __ellipsis_partial_arg_0))(
                        range(100)))))))))
~~~

This approach is better then previous, we don't need to manually wrap all functions with `ellipsis_partial` or
use `_` helper. Also we don't use custom `Partial`. But with this approach we
need to manually transform AST, so in [the next part](/2016/08/17/ast-import/) I'll show how we
can do it automatically with module finder/loader.

[Gist with sources](https://gist.github.com/nvbn/8d8b242ae88c97d1746e3b8b8ebbc257), [previous part](/2016/08/09/partial-piping/),
[next part](/2016/08/17/ast-import/).
