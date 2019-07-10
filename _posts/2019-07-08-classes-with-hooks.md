---
layout: post
title: "Mixing React Hooks with classes or making functional components more structured"
date: 2019-07-11 00:10:00
keywords: react, hooks, javascript
image: /assets/hookable_classes/hero.jpg
---

![Hook inside a class*](/assets/hookable_classes/hero.jpg)

Relatively not so long ago Hooks were introduced in React. They allow
us to have decoupled and reusable logic for components state and effects,
and make dependency injection easier. But API wise it looks a bit like a
step back from class-based components to sort of jQuery territory with tons
of nested functions.

So I thought that it might be nice to try to mix both approaches.

**TLDR:** [it's possible to make it nice and declarative](https://gist.github.com/nvbn/794971e8c968cacfb799c6427d01f162#file-counter-js-L11),
but it requires metaprogramming and [wouldn't work in some browsers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Browser_compatibility).

#### The hookable class adventure

Let's assume that we have a simple counter component:

~~~javascript
export default ({ initialCount }) => {
  const theme = useContext(Theme);

  const [current, setCurrent] = useState(initialCount);
  const [clicked, setClicked] = useState();

  const onClick = useCallback(() => {
    setCurrent(current + 1);
    setClicked(true);
  }, [current]);

  useEffect(() => {
    console.log("did mount");

    return () => {
      console.log("did unmount");
    };
  });

  return (
    <div>
      <p>
        Value: <span style={{ color: theme.numberColor }}>{current}</span>
      </p>
      {clicked && <p>You already clicked!</p>}
      <p>Initial value: {initialCount}</p>
      <button onClick={onClick}>Increase</button>
    </div>
  );
};
~~~

As a first step towards classes, I made a simple decorator, that creates a function
that initializes a class and calls `render` (the only similarity with original
class-based components interfaces) method.

~~~javascript
const asFunctional = cls => props => new cls(props).render();
~~~

As we can initialize attributes on a class body, it's already safe to move `useContext` to it:

~~~javascript
class Counter {
  theme = useContext(Theme);

  constructor({ initialCount }) {
    this.initialCount = initialCount;
  }

  render() {
    const [current, setCurrent] = useState(this.initialCount);
    const [clicked, setClicked] = useState();

    const onClick = useCallback(() => {
      setCurrent(current + 1);
      setClicked(true);
    }, [current]);

    useEffect(() => {
      console.log("did mount");

      return () => {
        console.log("did unmount");
      };
    });

    return (
      <div>
        <p>
          Value: <span style={{ color: this.theme.numberColor }}>{current}</span>
        </p>
        {clicked && <p>You already clicked!</p>}
        <p>Initial value: {this.initialCount}</p>
        <button onClick={onClick}>Increase</button>
      </div>
    );
  }
}

export default asFunctional(Counter);
~~~

Manual assignment of props as attributes looks ugly, and `useState` inside `render` is even worse.
It would be nice to be able to declare them on the class body. Unfortunately, [decorators
that can help with that aren't here yet](https://github.com/tc39/proposal-decorators), but we can use a
bit of [`Proxy` magic](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) by making
a base class that will intercept attributes assignment and inject values for props
and [descriptors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) for the state:

~~~javascript
const prop = () => ({ __isPropGetter: true });

const asDescriptor = ([val, setVal]) => ({
  __isDescriptor: true,
  get: () => val,
  set: newVal => setVal(newVal),
});

export const Hookable = function(props) {
  return new Proxy(this, {
    set: (obj, name, val) => {
      if (val && val.__isPropGetter) {
        obj[name] = props[name];
      } else if (val && val.__isDescriptor) {
        Object.defineProperty(obj, name, val);
      } else {
        obj[name] = val;
      }
      return true;
    },
  });
};
~~~

So now we can have descriptors for the state, and when a state attribute value will be changed,
`set...` will be called automatically. As we don't need to have the state in a closure,
it's safe to move `onClick` callback to the class body:

~~~javascript
class Counter extends Hookable {
  initialCount = prop();

  theme = useContext(Theme);

  current = asDescriptor(useState(this.initialCount));
  clicked = asDescriptor(useState());

  onClick = useCallback(() => {
    this.current += 1;
    this.clicked = true;
  }, [this.current]);

  render() {
    useEffect(() => {
      console.log("did mount");

      return () => {
        console.log("did unmount");
      };
    });

    return (
      <div>
        <p>
          Value: <span style={{ color: this.theme.numberColor }}>{this.current}</span>
        </p>
        {this.clicked && <p>You already clicked!</p>}
        <p>Initial value: {this.initialCount}</p>
        <button onClick={this.onClick}>Increase</button>
      </div>
    );
  }
}

export default asFunctional(Counter);
~~~

The only not so fancy part left is `useEffect` inside `render`. In Python world
similar problem with context managers API solved by [contextmanager decorator](https://docs.python.org/3/library/contextlib.html#contextlib.contextmanager), that transforms generators to context managers.
I tried the same approach with effects:

~~~javascript
export const fromGenerator = (hook, genFn, deps) => fn => {
  const gen = genFn();
  hook(() => {
    gen.next();

    return () => {
      gen.next();
    };
  }, deps);

  return fn;
};
~~~

#### The magical end result

As a result, we have `render` with only JSX and almost no nested functions in our component:

~~~javascript
class Counter extends Hookable {
  initialCount = prop();

  theme = useContext(Theme);

  current = asDescriptor(useState(this.initialCount));
  clicked = asDescriptor(useState());

  onClick = useCallback(() => {
    this.current += 1;
    this.clicked = true;
  }, [this.current]);

  withLogging = fromGenerator(
    useEffect,
    function*() {
      console.log("did mount");
      yield;
      console.log("did unmount");
    },
    [],
  );

  render = this.withLogging(() => (
    <div>
      <p>
        Value:{" "}
        <span style={{ color: this.theme.numberColor }}>{this.current}</span>
      </p>
      {this.clicked && <p>You already clicked!</p>}
      <p>Initial value: {this.initialCount}</p>
      <button onClick={this.onClick}>Increase</button>
    </div>
  ));
}

export default asFunctional(Counter);
~~~

And it even works:

<iframe src="/assets/hookable_classes/build/index.html" width="100%" height="160" frameBorder="0" scrolling="no"></iframe>

For my personal eyes, the end result looks better and more readable, but the magic inside
isn't free:

* [it doesn't work in Internet Explorer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Browser_compatibility)
* the machinery around Proxy might be slow
* it's impossible to make it properly typed with TypeScript or Flow
* metaprogramming could make things unnecessary more complicated

So I guess something in the middle (functor-like approach?) might be useful for real
applications.

[Gist with source code.](https://gist.github.com/nvbn/794971e8c968cacfb799c6427d01f162)

<small>* hero image contains [a photo of a classroom in Alaska](https://en.wikipedia.org/wiki/Classroom#/media/File:Elementary_classroom_in_Alaska.jpg)</small>
