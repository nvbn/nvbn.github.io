---
layout:     post
title:      "Configure Jest for React Native"
date:       2016-07-06 13:20:00
keywords:   react-native, jest, javascript
---

[Jest](https://facebook.github.io/jest/) is a very popular unit testing tool for React, but it doesn't work
with React Native out of the box. And even [instruction in React Native docs](https://facebook.github.io/react-native/docs/testing.html#jest-tests)
is wrong. If you use it you'll end up without ability to disable mocks, without
working es6 imports and with ton of `ReferenceError`.

So, I accumulated information from Jest issues and got working config.
 
First of all we need to install `jest-cli` and `babel-jest`:
 
~~~bash
npm install --save-dev jest-cli babel-jest babel-polyfill babel-preset-react-native
~~~

Then fill `.babelrc` with:

~~~json
{
  "presets": ["react-native"],
  "retainLines": true
}
~~~

Without `retainLines` you'll get wrong line numbers in tests traces.

And update `package.json`:

~~~json
{
  ...
  "scripts": {
    ...
    "test": "jest"
  },
  "jest": {
    "haste": {
      "defaultPlatform": "android",
      "platforms": [
        "ios",
        "android"
      ],
      "providesModuleNodeModules": [
        "react-native"
      ]
    },
    "unmockedModulePathPatterns": [
      "promise",
      "source-map"
    ]
  }
}
~~~

That's all, now you can run tests with:

~~~bash
npm test
~~~

Also a lot of outdated docs uses `jest.autoMockOff`, it's deprecated and doesn't
work with es6 imports. You should use `jest.disableAutomock()`.
