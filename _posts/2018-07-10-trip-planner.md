---
layout:     post
title:      "How I was planning a trip to South America with JavaScript, Python and Google Flights abuse"
date:       2018-07-10 00:40:00
keywords:   javascript, python, google flights, trip, south america
image:      /assets/sa_trip_price_dates.png
---

I was planning a trip to South America for a while. As I have flexible dates and want to visit
a few places, it was very hard to find proper flights. So I decided to try to automatize everything.

I've already done [something similar before with Clojure and Chrome](/2015/07/17/flight-prices/),
but it was only for a single flight and doesn't work anymore.

### Parsing flights information

Apparently, there's no open API for getting information about flights.
But as [Google Flights](https://www.google.com/flights?hl=en) can show a calendar with
prices for dates for two months I decided to use it:

![Calendar with prices](/assets/sa_trip_price_dates.png)

So I've generated every possible combination of interesting destinations in South America and
flights to and from Amsterdam. Simulated user interaction with changing destination inputs and
opening/closing calendar. By the end, I wrote results as JSON in a new tab. The whole code
isn't that interesting and available in [the gist](https://gist.github.com/nvbn/05225aa1f55e5d57b71824010c3ba892#file-parse-js). From the high level it looks like:

~~~javascript
const getFlightsData = async ([from, to]) => {
  await setDestination(FROM, from);
  await setDestination(TO, to);

  const prices = await getPrices();

  return prices.map(([date, price]) => ({
    date, price, from, to,
  }));
};

const collectData = async () => {
  let result = [];
  for (let flight of getAllPossibleFlights()) {
    const flightsData = await getFlightsData(flight);
    result = result.concat(flightsData);
  }
  return result;
};

const win = window.open('');

collectData().then(
  (data) => win.document.write(JSON.stringify(data)),
  (error) => console.error("Can't get flights", error),
);
~~~

In action:

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/sKxwqYHoht0?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

I've run it twice to have separate data for flights with and without stops, and just saved
the result to JSON files with content like:

~~~json
[{"date":"2018-07-05","price":476,"from":"Rio de Janeiro","to":"Montevideo"},
{"date":"2018-07-06","price":470,"from":"Rio de Janeiro","to":"Montevideo"},
{"date":"2018-07-07","price":476,"from":"Rio de Janeiro","to":"Montevideo"},
...]
~~~

Although, it mostly works, in some rare cases it looks like Google Flights has some sort of
anti-parser and show "random" prices.

### Selecting the best trips

In the previous part, I've parsed 10110 flights with stop and 6422 non-stop flights, it's impossible to use
brute force algorithm here (I've tried). As reading data from JSON isn't interesting, I'll skip that part.

At first, I've built an index of `from destination` &rarr; `day` &rarr; `to destination`:

~~~python
from_id2day_number2to_id2flight = defaultdict(
    lambda: defaultdict(
        lambda: {}))
for flight in flights:
    from_id2day_number2to_id2flight[flight.from_id] \
        [flight.day_number][flight.to_id] = flight
~~~

Created a recursive generator that creates all possible trips:

~~~python
def _generate_trips(can_visit, can_travel, can_spent, current_id,
                    current_day, trip_flights):
    # The last flight is to home city, the end of the trip
    if trip_flights[-1].to_id == home_city_id:
        yield Trip(
            price=sum(flight.price for flight in trip_flights),
            flights=trip_flights)
        return

    # Everything visited or no vacation days left or no money left
    if not can_visit or can_travel < MIN_STAY or can_spent == 0:
        return

    # The minimal amount of cities visited, can start "thinking" about going home
    if len(trip_flights) >= MIN_VISITED and home_city_id not in can_visit:
        can_visit.add(home_city_id)

    for to_id in can_visit:
        can_visit_next = can_visit.difference({to_id})
        for stay in range(MIN_STAY, min(MAX_STAY, can_travel) + 1):
            current_day_next = current_day + stay
            flight_next = from_id2day_number2to_id2flight \
                .get(current_id, {}).get(current_day_next, {}).get(to_id)
            if not flight_next:
                continue

            can_spent_next = can_spent - flight_next.price
            if can_spent_next < 0:
                continue

            yield from _generate_trips(
                can_visit_next, can_travel - stay, can_spent_next, to_id,
                                current_day + stay, trip_flights + [flight_next])
~~~

As the algorithm is easy to parallel, I've made it possible to run with `Pool.pool.imap_unordered`,
and pre-sort for future sorting with merge sort:

~~~python
def _generator_stage(params):
    return sorted(_generate_trips(*params), key=itemgetter(0))
~~~

Then generated initial flights and other trip flights in parallel:

~~~python
def generate_trips():
    generators_params = [(
        city_ids.difference({start_id, home_city_id}),
        MAX_TRIP,
        MAX_TRIP_PRICE - from_id2day_number2to_id2flight[home_city_id][start_day][start_id].price,
        start_id,
        start_day,
        [from_id2day_number2to_id2flight[home_city_id][start_day][start_id]])
        for start_day in range((MAX_START - MIN_START).days)
        for start_id in from_id2day_number2to_id2flight[home_city_id][start_day].keys()]

    with Pool(cpu_count() * 2) as pool:
        for n, stage_result in enumerate(pool.imap_unordered(_generator_stage, generators_pa
rams)):
            yield stage_result
~~~

And sorted everything with `heapq.merge`:

~~~python
trips = [*merge(*generate_trips(), key=itemgetter(0))]
~~~~

*Looks like a solution to a job interview question.*

Without optimizations, it was taking more than an hour and consumed almost whole RAM
(apparently `typing.NamedTuple` isn't memory efficient with `multiprocessing` at all),
but current implementation takes 1 minute 22 seconds on my laptop.

As the last step I've saved results in csv (the code isn't interesting and available in [the gist](https://gist.github.com/nvbn/05225aa1f55e5d57b71824010c3ba892#file-find-py)), like:

~~~
price,days,cities,start city,start date,end city,end date,details
1373,15,4,La Paz,2018-09-15,Buenos Aires,2018-09-30,Amsterdam -> La Paz 2018-09-15 498 & La Paz -> Santiago 2018-09-18 196 & Santiago -> Montevideo 2018-09-23 99 & Montevideo -> Buenos Aires 2018-09-26 120 & Buenos Aires -> Amsterdam 2018-09-30 460
1373,15,4,La Paz,2018-09-15,Buenos Aires,2018-09-30,Amsterdam -> La Paz 2018-09-15 498 & La Paz -> Santiago 2018-09-18 196 & Santiago -> Montevideo 2018-09-23 99 & Montevideo -> Buenos Aires 2018-09-27 120 & Buenos Aires -> Amsterdam 2018-09-30 460
1373,15,4,La Paz,2018-09-15,Buenos Aires,2018-09-30,Amsterdam -> La Paz 2018-09-15 498 & La Paz -> Santiago 2018-09-20 196 & Santiago -> Montevideo 2018-09-23 99 & Montevideo -> Buenos Aires 2018-09-26 120 & Buenos Aires -> Amsterdam 2018-09-30 460
1373,15,4,La Paz,2018-09-15,Buenos Aires,2018-09-30,Amsterdam -> La Paz 2018-09-15 498 & La Paz -> Santiago 2018-09-20 196 & Santiago -> Montevideo 2018-09-23 99 & Montevideo -> Buenos Aires 2018-09-27 120 & Buenos Aires -> Amsterdam 2018-09-30 460
...
~~~

[Gist with sources](https://gist.github.com/nvbn/05225aa1f55e5d57b71824010c3ba892).
