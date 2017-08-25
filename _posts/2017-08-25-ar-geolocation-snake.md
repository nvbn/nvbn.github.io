---
layout:     post
title:      "AR* Geolocation Snake"
date:       2017-08-25 10:00:00
keywords:   android, react-native, javascript
image:      /assets/ar-snake/game.png
---

![instruction](/assets/ar-snake/instruction.png) &nbsp;&nbsp;&nbsp; ![gameplay](/assets/ar-snake/game.png)

I like rollerskating, but sometimes it's kind of boring to
skate by the same routes. I was using Pokemon GO for making
the route more fun, but pokestops have fixed locations and 
catching the pokemons after a few months is kind of boring too.
So I thought that it can be interesting to randomly select places to
skate. And snake game makes it even more interesting and
challenging because I need to select a more complex route
for avoiding snake's tail and not losing the game.

Although sometimes the app puts candies on the other side of the road
or requires me to ride on a sidewalk with intolerable quality,
I solved it with an option to regenerate the candy.
 
**TLDR:** [the app](https://play.google.com/store/apps/details?id=com.arsnake), [source code](https://github.com/nvbn/ArSnake).

### What's inside

The app is written in JavaScript with [flow](https://flow.org/),
[React Native](https://facebook.github.io/react-native/) and
[redux](http://redux.js.org/) with [redux-thunk](https://github.com/gaearon/redux-thunk).
For the map, I used [react-native-maps](https://github.com/airbnb/react-native-maps)
which are nice, because it works almost out of the box. So mostly
the game is very simple.

The first challenging part is candies generation. As a first attempt
the app uses [nearby search from Google Places API](https://developers.google.com/places/web-service/search?hl=en#PlaceSearchRequests)
(hah, it's already deprecated) with a specified radius, filters
places with the radius greater than minimal and selects random place. As we
can't just use coordinates for filtering by distance, I used
[node-geopoint](https://github.com/davidwood/node-geopoint) library.

```javascript
const generateCandyFromPlacesNearby = async (
  position: Position,
): Promise<?Position> => {
  const positionPoint = new GeoPoint(position.latitude, position.longitude);

  const response = await fetch(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
      `location=${position.latitude},${position.longitude}` +
      `radius=${config.CANDY_MAX_DISTANCE}`,
  );
  const { results } = await response.json();

  const availablePositions = results.filter(({ geometry }) => {
    const point = new GeoPoint(geometry.location.lat, geometry.location.lng);

    return positionPoint.distanceTo(point, true) > constants.CANDY_MIN_DISTANCE;
  });

  return sample(availablePositions);
};
```

If there's no place with appropriate distance in the specified radius,
the app just chooses a random latitude and longitude offset within
specified bounds.

```javascript
const generateCandyFromRandom = (position: Position): Position => {
  const point = new GeoPoint(position.latitude, position.longitude);
  const [minNE, minSW] = point.boundingCoordinates(
    constants.CANDY_MIN_DISTANCE,
    undefined,
    true,
  );
  const [maxNE, maxSW] = point.boundingCoordinates(
    constants.CANDY_MAX_DISTANCE,
    undefined,
    true,
  );

  switch (random(3)) {
    case 0:
      return {
        latitude: random(minNE.latitude(), maxNE.latitude()),
        longitude: random(minNE.longitude(), maxNE.longitude()),
      };
    case 1:
      return {
        latitude: random(minSW.latitude(), maxSW.latitude()),
        longitude: random(minNE.longitude(), maxNE.longitude()),
      };
    case 2:
      return {
        latitude: random(minNE.latitude(), maxNE.latitude()),
        longitude: random(minSW.longitude(), maxSW.longitude()),
      };
    default:
      return {
        latitude: random(minSW.latitude(), maxSW.latitude()),
        longitude: random(minSW.longitude(), maxSW.longitude()),
      };
  }
};
```

And the last complicated part is detecting if the player touches
snake's tail. As we store tail as a list of coordinates, the game
just checks if the head within aspecified radius of the tail parts.
  
```javascript
export const isTouched = (
  a: Position,
  b: Position,
  radius: number,
): boolean => {
  const aPoint = new GeoPoint(a.latitude, a.longitude);
  const bPoint = new GeoPoint(b.latitude, b.longitude);

  return aPoint.distanceTo(bPoint, true) <= radius;
};

export const isSnakeTouchedHimself = (positions: Position[]): boolean =>
  some(positions.slice(2), position =>
    isTouched(positions[0], position, constants.SNAKE_TOUCH_RADIUS),
  );
```

[Play Store](https://play.google.com/store/apps/details?id=com.arsnake), [Github](https://github.com/nvbn/ArSnake).

<sub>* like Pokemon GO without a camera.</sub>
