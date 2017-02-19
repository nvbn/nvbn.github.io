---
layout:     post
title:      "Testing React Native components without enzyme"
date:       2017-02-19 13:00:00
keywords:   javascript, js, react, react-native
---

In React world [enzyme](https://github.com/airbnb/enzyme) is very popular,
but it works poorly with react-native and [requires some ugly mocks](https://github.com/airbnb/enzyme/blob/master/docs/guides/react-native.md).

So I thought it would be easier to test components without it. First of
all, React offers us [react-test-renderer](https://github.com/facebook/react/tree/master/packages/react-test-renderer),
that can render components to JSON:

~~~javascript
import { View, Text, Button } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

const rendered = ReactTestRenderer.create(
  <View>
    <Text>Hello</Text>
    <Button title="OK" onPress={() => console.log('OK')}/>
  </View>
).toJSON();

console.log(rendered);
~~~

As a result, we got some big object:

~~~json
{
  "type": "View",
  "props": {},
  "children": [
    {
      "type": "Text",
      "props": {
        "accessible": true,
        "allowFontScaling": true,
        "ellipsizeMode": "tail"
      },
      "children": [
        "Hello"
      ]
    },
    {
      "type": "View",
      "props": {
        "accessible": true,
        "accessibilityComponentType": "button",
        "accessibilityTraits": [
          "button"
        ],
        "style": {
          "opacity": 1
        },
        "isTVSelectable": true
      },
      "children": [
        {
          "type": "View",
          "props": {
            "style": [
              {}
            ]
          },
          "children": [
            {
              "type": "Text",
              "props": {
                "style": [
                  {
                    "color": "#0C42FD",
                    "textAlign": "center",
                    "padding": 8,
                    "fontSize": 18
                  }
                ],
                "accessible": true,
                "allowFontScaling": true,
                "ellipsizeMode": "tail"
              },
              "children": [
                "OK"
              ]
            }
          ]
        }
      ]
    }
  ]
}
~~~

It's already not too hard to find children components which you want to test,
but I prefer using a little utility function:

~~~javascript
import { flatMap } from "lodash";

const query = (node, match) => {
  let result = [];
  let notProcessed = [node];

  while (notProcessed.length) {
    result = [...result, ...notProcessed.filter(match)];
    notProcessed = flatMap(notProcessed, ({children}) => children || []);
  }

  return result;
};
~~~

With which it's easy to find, for example, all `Text` nodes:
 
~~~javascript
query(rendered, ({type}) => type === 'Text');

[
  {
    type: 'Text',
    props: {
      accessible: true,
      allowFontScaling: true,
      ellipsizeMode: 'tail'
    },
    children: ['Hello']
  },
  {
    type: 'Text',
    props: {
      style: [Object],
      accessible: true,
      allowFontScaling: true,
      ellipsizeMode: 'tail'
    },
    children: ['OK']
  }
]
~~~

You can notice that we have `Text` node for our `Button`, it's because of underlying
realization of `Button` component, if we don't want to see insides of some component,
we can easily mock it:

~~~javascript
jest.mock('Button', () => 'Button');
query(rendered, ({type}) => type === 'Button');

[{
  type: 'Button',
  props: {title: 'OK', onPress: [Function: onPress]},
  children: null
}];
~~~

Enzyme has a useful method `simulate`, instead of it, we can just call callbacks properties,
like `onPress` on out button:

~~~javascript
query(rendered, ({type}) => type === 'Button')[0].onPress();

// OK
~~~

It's harder when you need to pass an event object to a callback, but it always can be mocked.
