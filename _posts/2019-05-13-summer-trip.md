---
layout: post
title: "Finding the cheapest flights for a multi-leg trip with Amadeus API and Python"
date: 2019-05-13 22:40:00
keywords: python, amadeus, pandas
image: /assets/amadeus/hero.jpg
---

![An old plane](/assets/amadeus/hero.jpg)

This summer I'm planning to have a trip that will include Moscow, Irkutsk, Beijing, Shanghai, and Tokyo.
As I'm flexible on dates I've decided to try to find the cheapest flights with the shortest duration.
I've tried [to do this before](2015/07/17/flight-prices/) twice by parsing [Google Flights](/2018/07/10/trip-planner/),
it was successful, but I don't want to update those hackish scripts and want to try something a bit saner.

So I chose to try [Amadeus API](https://developers.amadeus.com/self-service). It was a bit painful to use,
[some endpoints](https://developers.amadeus.com/self-service/category/air/api-doc/flight-cheapest-date-search) were randomly failing with 500, and they needed a signed agreement to use real data.
But overall it was at least better than parsing Google Flights, and the whole adventure fit inside
the free quota for requests.

**TLDR:** [jupyter notebook with the whole adventure](https://gist.github.com/nvbn/4837ee00d77299b22ce15656bc291ef8)

### Restrictions

I'm flexible but with boundaries, so I'll be able to start between 10th and 20th of July and
travel no longer than 21 days:

~~~python
min_start = date(2019, 7, 10)
max_start = date(2019, 7, 20)
max_days = 21
~~~

I mostly don't want to have multi-segment flights and know how many days I want to spend in destinations:

~~~python
places_df = pd.DataFrame([('Amsterdam', 'NL', 0, (max_start - min_start).days, True),  # for enabling tentative start date
                          ('Moscow', 'RU', 3, 5, True),
                          ('Irkutsk', 'RU', 7, 10, True),
                          ('Beijing', 'CN', 3, 5, True),
                          ('Shanghai', 'CN', 3, 5, True),
                          ('Tokyo', 'JP', 3, 5, False),
                          ('Amsterdam', 'NL', 0, 0, True)],  # the final destination
                         columns=['city', 'cc', 'min_days', 'max_days', 'only_direct'])

places_df['min_day_of_dep'] = places_df.min_days.rolling(min_periods=1, window=len(places_df)).sum()
places_df['max_day_of_dep'] = places_df.max_days.rolling(min_periods=1, window=len(places_df)).sum()

places_df
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>city</th>
      <th>cc</th>
      <th>min_days</th>
      <th>max_days</th>
      <th>only_direct</th>
      <th>min_day_of_dep</th>
      <th>max_day_of_dep</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>0</td>
      <td>10</td>
      <td>True</td>
      <td>0.0</td>
      <td>10.0</td>
    </tr>
    <tr>
      <th>1</th>
      <td>Moscow</td>
      <td>RU</td>
      <td>3</td>
      <td>5</td>
      <td>True</td>
      <td>3.0</td>
      <td>15.0</td>
    </tr>
    <tr>
      <th>2</th>
      <td>Irkutsk</td>
      <td>RU</td>
      <td>7</td>
      <td>10</td>
      <td>True</td>
      <td>10.0</td>
      <td>25.0</td>
    </tr>
    <tr>
      <th>3</th>
      <td>Beijing</td>
      <td>CN</td>
      <td>3</td>
      <td>5</td>
      <td>True</td>
      <td>13.0</td>
      <td>30.0</td>
    </tr>
    <tr>
      <th>4</th>
      <td>Shanghai</td>
      <td>CN</td>
      <td>3</td>
      <td>5</td>
      <td>True</td>
      <td>16.0</td>
      <td>35.0</td>
    </tr>
    <tr>
      <th>5</th>
      <td>Tokyo</td>
      <td>JP</td>
      <td>3</td>
      <td>5</td>
      <td>False</td>
      <td>19.0</td>
      <td>40.0</td>
    </tr>
    <tr>
      <th>6</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>0</td>
      <td>0</td>
      <td>True</td>
      <td>19.0</td>
      <td>40.0</td>
    </tr>
  </tbody>
</table>

### Airports

A lot of big cities have more than one airport, and usually, some airports are for low-costers and some
for pricier flights. But the most important that the API expects me to send IATA codes to get
prices for dates. So I needed to get IATA codes for airports for cities I will travel through,
and it's possible with just a request to [/reference-data/locations](https://developers.amadeus.com/self-service/category/air/api-doc/airport-and-city-search/api-reference):

~~~python
def get_iata(city, cc):
    response = call_api('/reference-data/locations',  # full code in the notebook
                        keyword=city,
                        countryCode=cc,
                        subType='AIRPORT')

    return [result['iataCode'] for result in response['data']]

get_iata('Moscow', 'RU')
~~~

~~~python
['DME', 'SVO', 'VKO']
~~~

With that function, I was able to get IATA codes for all destinations and get all possible routes with
a bit of pandas magic:

~~~python
places_df['iata'] = places_df.apply(lambda place: get_iata(place['city'], place['cc']), axis=1)

routes_df = places_df.assign(dest_iata=places_df.iloc[1:].reset_index().iata)
routes_df['routes'] = routes_df.apply(
    lambda row: [*product(row['iata'], row['dest_iata'])] if isinstance(row['dest_iata'], list) else [],
    axis=1)

routes_df = routes_df.routes \
    .apply(pd.Series) \
    .merge(routes_df, right_index=True, left_index=True) \
    .drop(['routes', 'min_days', 'max_days', 'iata', 'dest_iata'], axis=1) \
    .melt(id_vars=['city', 'cc', 'min_day_of_dep', 'max_day_of_dep', 'only_direct'], value_name="route") \
    .drop('variable', axis=1) \
    .dropna()

routes_df['origin'] = routes_df.route.apply(lambda route: route[0])
routes_df['destination'] = routes_df.route.apply(lambda route: route[1])
routes_df = routes_df \
    .drop('route', axis=1) \
    .rename(columns={'city': 'origin_city',
                     'cc': 'origin_cc'})

routes_df.head(10)
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>origin_city</th>
      <th>origin_cc</th>
      <th>min_day_of_dep</th>
      <th>max_day_of_dep</th>
      <th>only_direct</th>
      <th>origin</th>
      <th>destination</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>0.0</td>
      <td>10.0</td>
      <td>True</td>
      <td>AMS</td>
      <td>DME</td>
    </tr>
    <tr>
      <th>1</th>
      <td>Moscow</td>
      <td>RU</td>
      <td>3.0</td>
      <td>15.0</td>
      <td>True</td>
      <td>DME</td>
      <td>IKT</td>
    </tr>
    <tr>
      <th>2</th>
      <td>Irkutsk</td>
      <td>RU</td>
      <td>10.0</td>
      <td>25.0</td>
      <td>True</td>
      <td>IKT</td>
      <td>PEK</td>
    </tr>
    <tr>
      <th>3</th>
      <td>Beijing</td>
      <td>CN</td>
      <td>13.0</td>
      <td>30.0</td>
      <td>True</td>
      <td>PEK</td>
      <td>PVG</td>
    </tr>
    <tr>
      <th>4</th>
      <td>Shanghai</td>
      <td>CN</td>
      <td>16.0</td>
      <td>35.0</td>
      <td>True</td>
      <td>PVG</td>
      <td>HND</td>
    </tr>
    <tr>
      <th>5</th>
      <td>Tokyo</td>
      <td>JP</td>
      <td>19.0</td>
      <td>40.0</td>
      <td>False</td>
      <td>HND</td>
      <td>AMS</td>
    </tr>
    <tr>
      <th>7</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>0.0</td>
      <td>10.0</td>
      <td>True</td>
      <td>AMS</td>
      <td>SVO</td>
    </tr>
    <tr>
      <th>8</th>
      <td>Moscow</td>
      <td>RU</td>
      <td>3.0</td>
      <td>15.0</td>
      <td>True</td>
      <td>SVO</td>
      <td>IKT</td>
    </tr>
    <tr>
      <th>9</th>
      <td>Irkutsk</td>
      <td>RU</td>
      <td>10.0</td>
      <td>25.0</td>
      <td>True</td>
      <td>IKT</td>
      <td>NAY</td>
    </tr>
    <tr>
      <th>10</th>
      <td>Beijing</td>
      <td>CN</td>
      <td>13.0</td>
      <td>30.0</td>
      <td>True</td>
      <td>PEK</td>
      <td>SHA</td>
    </tr>
  </tbody>
</table>
To understand the complexity of the problem better I draw an ugly graph of possible
flights routes:

![The ugly graph with airports](/assets/amadeus/airports.png)

### Prices and dates

After that I've calculated all possible dates for flights:

~~~python
route_dates_df = routes_df.assign(
    dates=routes_df.apply(lambda row: [min_start + timedelta(days=days)
                                       for days in range(int(row.min_day_of_dep), int(row.max_day_of_dep) + 1)],
                          axis=1))

route_dates_df = route_dates_df.dates \
    .apply(pd.Series) \
    .merge(route_dates_df, right_index=True, left_index=True) \
    .drop(['dates', 'min_day_of_dep', 'max_day_of_dep'], axis=1) \
    .melt(id_vars=['origin_city', 'origin_cc', 'origin', 'destination', 'only_direct'], value_name="date") \
    .drop('variable', axis=1) \
    .dropna()

valid_routes_df = route_dates_df[route_dates_df.date <= max_start + timedelta(days=max_days)]

valid_routes_df.head(10)
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>origin_city</th>
      <th>origin_cc</th>
      <th>origin</th>
      <th>destination</th>
      <th>only_direct</th>
      <th>date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>AMS</td>
      <td>DME</td>
      <td>True</td>
      <td>2019-07-10</td>
    </tr>
    <tr>
      <th>1</th>
      <td>Moscow</td>
      <td>RU</td>
      <td>DME</td>
      <td>IKT</td>
      <td>True</td>
      <td>2019-07-13</td>
    </tr>
    <tr>
      <th>2</th>
      <td>Irkutsk</td>
      <td>RU</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>True</td>
      <td>2019-07-20</td>
    </tr>
    <tr>
      <th>3</th>
      <td>Beijing</td>
      <td>CN</td>
      <td>PEK</td>
      <td>PVG</td>
      <td>True</td>
      <td>2019-07-23</td>
    </tr>
    <tr>
      <th>4</th>
      <td>Shanghai</td>
      <td>CN</td>
      <td>PVG</td>
      <td>HND</td>
      <td>True</td>
      <td>2019-07-26</td>
    </tr>
    <tr>
      <th>5</th>
      <td>Tokyo</td>
      <td>JP</td>
      <td>HND</td>
      <td>AMS</td>
      <td>False</td>
      <td>2019-07-29</td>
    </tr>
    <tr>
      <th>6</th>
      <td>Amsterdam</td>
      <td>NL</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>True</td>
      <td>2019-07-10</td>
    </tr>
    <tr>
      <th>7</th>
      <td>Moscow</td>
      <td>RU</td>
      <td>SVO</td>
      <td>IKT</td>
      <td>True</td>
      <td>2019-07-13</td>
    </tr>
    <tr>
      <th>8</th>
      <td>Irkutsk</td>
      <td>RU</td>
      <td>IKT</td>
      <td>NAY</td>
      <td>True</td>
      <td>2019-07-20</td>
    </tr>
    <tr>
      <th>9</th>
      <td>Beijing</td>
      <td>CN</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>True</td>
      <td>2019-07-23</td>
    </tr>
  </tbody>
</table>

Eventually, I've got 363 possible route-date combinations, and used [/shopping/flight-offers](https://developers.amadeus.com/self-service/category/air/api-doc/flight-low-fare-search/api-reference) to get prices.
As the endpoint has a quota of 2000 free requests, I was able to mess everything up a few times and
haven't reached it yet:

~~~python
def get_prices(origin, destination, date, only_direct):
    response = call_api('/shopping/flight-offers',
                         origin=origin,
                         destination=destination,
                         nonStop='true' if only_direct else 'false',
                         departureDate=date.strftime("%Y-%m-%d"))

    if 'data' not in response:
        print(response)
        return []

    return [(origin, destination, date,
             Decimal(offer_item['price']['total']),
             parse_date(offer_item['services'][0]['segments'][0]['flightSegment']['departure']['at']),
             parse_date(offer_item['services'][0]['segments'][-1]['flightSegment']['arrival']['at']),
             len(offer_item['services'][0]['segments']))
            for flight in response['data']
            for offer_item in flight['offerItems']]

get_prices('IKT', 'PEK', date(2019, 7, 20), True)[:5]
~~~

~~~python
[('IKT',
  'PEK',
  datetime.date(2019, 7, 20),
  Decimal('209.11'),
  datetime.datetime(2019, 7, 20, 1, 50, tzinfo=tzoffset(None, 28800)),
  datetime.datetime(2019, 7, 20, 4, 40, tzinfo=tzoffset(None, 28800)),
  1),
 ('IKT',
  'PEK',
  datetime.date(2019, 7, 20),
  Decimal('262.98'),
  datetime.datetime(2019, 7, 20, 15, 15, tzinfo=tzoffset(None, 28800)),
  datetime.datetime(2019, 7, 20, 18, 5, tzinfo=tzoffset(None, 28800)),
  1)]
~~~

Then I've fetched flights for the whole set of dates, assigned useful metadata like origin/destination
cities and duration of the flights, and removed flights pricier than €800:

~~~python
prices_df = pd.DataFrame([price
                          for route in valid_routes_df.to_dict('record')
                          for price in get_prices(route['origin'], route['destination'], route['date'], route['only_direct'])],
                         columns=['origin', 'destination', 'date', 'price', 'departure_at', 'arrival_at', 'segments'])

airport_to_city = dict(zip(routes_df.origin, routes_df.origin_city))

prices_with_city_df = prices_df \
    .assign(duration=prices_df.arrival_at - prices_df.departure_at,
            origin_city=prices_df.origin.apply(airport_to_city.__getitem__),
            destination_city=prices_df.destination.apply(airport_to_city.__getitem__))
prices_with_city_df['route'] = prices_with_city_df.origin_city + " ✈️ " + prices_with_city_df.destination_city

valid_prices_with_city_df = prices_with_city_df[prices_with_city_df.price <= 800]

valid_prices_with_city_df.head()
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>origin</th>
      <th>destination</th>
      <th>date</th>
      <th>price</th>
      <th>departure_at</th>
      <th>arrival_at</th>
      <th>segments</th>
      <th>duration</th>
      <th>origin_city</th>
      <th>destination_city</th>
      <th>route</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>257.40</td>
      <td>2019-07-13 21:40:00+03:00</td>
      <td>2019-07-14 08:25:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow✈️Irkutsk</td>
    </tr>
    <tr>
      <th>1</th>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>257.40</td>
      <td>2019-07-13 23:00:00+03:00</td>
      <td>2019-07-14 09:45:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow✈️Irkutsk</td>
    </tr>
    <tr>
      <th>2</th>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>254.32</td>
      <td>2019-07-13 19:55:00+03:00</td>
      <td>2019-07-14 06:25:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow✈️Irkutsk</td>
    </tr>
    <tr>
      <th>3</th>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow✈️Irkutsk</td>
    </tr>
    <tr>
      <th>4</th>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk✈️Beijing</td>
    </tr>
  </tbody>
</table>

To have a brief overview of prices I've made a scatterplot. If I was a machine learning algorithm I would exclude
Tokyo from the adventure:

![Scatterplot with prices and duration](/assets/amadeus/routes_zoom.png)

### Itinerary

At this stage I've got all the data I want, so I can begin building the itinerary. I've calculated
all possible city/date combination of flights. Job interviews questions prepared me for that:

~~~python
next_flight_origin_city = dict(zip(places_df.city.iloc[:-2], places_df.city.iloc[1:-1]))
place_min_days = dict(zip(places_df.city.iloc[:-1], places_df.min_days.iloc[:-1]))
place_max_days = dict(zip(places_df.city.iloc[:-1], places_df.max_days.iloc[:-1]))

def build_itinerary(place, date):
    if place is None:
        return

    next_place = next_flight_origin_city.get(place)

    for days in range(place_min_days[place], place_max_days[place] + 1):
        flight_date = date + timedelta(days=days)
        for rest_flights in build_itinerary(next_place, flight_date):
            yield [(place, flight_date), *rest_flights]

        if next_place is None:
            yield [(place, flight_date)]

itinerary = [*build_itinerary('Amsterdam', min_start)]
itinerary[:3]
~~~

~~~python
[[('Amsterdam', datetime.date(2019, 7, 10)),
  ('Moscow', datetime.date(2019, 7, 13)),
  ('Irkutsk', datetime.date(2019, 7, 20)),
  ('Beijing', datetime.date(2019, 7, 23)),
  ('Shanghai', datetime.date(2019, 7, 26)),
  ('Tokyo', datetime.date(2019, 7, 29))],
 [('Amsterdam', datetime.date(2019, 7, 10)),
  ('Moscow', datetime.date(2019, 7, 13)),
  ('Irkutsk', datetime.date(2019, 7, 20)),
  ('Beijing', datetime.date(2019, 7, 23)),
  ('Shanghai', datetime.date(2019, 7, 26)),
  ('Tokyo', datetime.date(2019, 7, 30))],
 [('Amsterdam', datetime.date(2019, 7, 10)),
  ('Moscow', datetime.date(2019, 7, 13)),
  ('Irkutsk', datetime.date(2019, 7, 20)),
  ('Beijing', datetime.date(2019, 7, 23)),
  ('Shanghai', datetime.date(2019, 7, 26)),
  ('Tokyo', datetime.date(2019, 7, 31))]]
~~~

And then I've found all flights for those dates. As amount of possible flights
combinations didn't fit in my RAM, I was selecting `n_cheapest` flights on each stage.
The code is slow and ugly, but it worked:

~~~python
def find_flights(prices_with_city_df, itinerary_route, n_cheapest):
    result_df = None
    for place, date in itinerary_route:
        place_df = prices_with_city_df \
            [(prices_with_city_df.origin_city == place) & (prices_with_city_df.date == date)] \
            .sort_values('price', ascending=True) \
            .head(n_cheapest) \
            .add_prefix(f'{place}_')

        if result_df is None:
            result_df = place_df
        else:
            result_df = result_df \
                .assign(key=1) \
                .merge(place_df.assign(key=1), on="key") \
                .drop("key", axis=1)

            result_df['total_price'] = reduce(operator.add, (
                result_df[column] for column in result_df.columns
                if 'price' in column and column != 'total_price'
            ))

            result_df = result_df \
                .sort_values('total_price', ascending=True) \
                .head(n_cheapest)

    result_df['total_flights_duration'] = reduce(operator.add, (
        result_df[column] for column in result_df.columns
        if 'duration' in column
    ))

    return result_df[['total_price', 'total_flights_duration'] + [
        column for column in result_df.columns
        if 'total_' not in column]]

find_flights(prices_with_city_df, itinerary[0], 100).head(5)
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>total_price</th>
      <th>total_flights_duration</th>
      <th>Amsterdam_origin</th>
      <th>Amsterdam_destination</th>
      <th>Amsterdam_date</th>
      <th>Amsterdam_price</th>
      <th>Amsterdam_departure_at</th>
      <th>Amsterdam_arrival_at</th>
      <th>Amsterdam_segments</th>
      <th>Amsterdam_duration</th>
      <th>Amsterdam_origin_city</th>
      <th>Amsterdam_destination_city</th>
      <th>Amsterdam_route</th>
      <th>Moscow_origin</th>
      <th>Moscow_destination</th>
      <th>Moscow_date</th>
      <th>Moscow_price</th>
      <th>Moscow_departure_at</th>
      <th>Moscow_arrival_at</th>
      <th>Moscow_segments</th>
      <th>Moscow_duration</th>
      <th>Moscow_origin_city</th>
      <th>Moscow_destination_city</th>
      <th>Moscow_route</th>
      <th>Irkutsk_origin</th>
      <th>Irkutsk_destination</th>
      <th>Irkutsk_date</th>
      <th>Irkutsk_price</th>
      <th>Irkutsk_departure_at</th>
      <th>Irkutsk_arrival_at</th>
      <th>Irkutsk_segments</th>
      <th>Irkutsk_duration</th>
      <th>Irkutsk_origin_city</th>
      <th>Irkutsk_destination_city</th>
      <th>Irkutsk_route</th>
      <th>Beijing_origin</th>
      <th>Beijing_destination</th>
      <th>Beijing_date</th>
      <th>Beijing_price</th>
      <th>Beijing_departure_at</th>
      <th>Beijing_arrival_at</th>
      <th>Beijing_segments</th>
      <th>Beijing_duration</th>
      <th>Beijing_origin_city</th>
      <th>Beijing_destination_city</th>
      <th>Beijing_route</th>
      <th>Shanghai_origin</th>
      <th>Shanghai_destination</th>
      <th>Shanghai_date</th>
      <th>Shanghai_price</th>
      <th>Shanghai_departure_at</th>
      <th>Shanghai_arrival_at</th>
      <th>Shanghai_segments</th>
      <th>Shanghai_duration</th>
      <th>Shanghai_origin_city</th>
      <th>Shanghai_destination_city</th>
      <th>Shanghai_route</th>
      <th>Tokyo_origin</th>
      <th>Tokyo_destination</th>
      <th>Tokyo_date</th>
      <th>Tokyo_price</th>
      <th>Tokyo_departure_at</th>
      <th>Tokyo_arrival_at</th>
      <th>Tokyo_segments</th>
      <th>Tokyo_duration</th>
      <th>Tokyo_origin_city</th>
      <th>Tokyo_destination_city</th>
      <th>Tokyo_route</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>1901.41</td>
      <td>1 days 20:45:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 21:15:00+02:00</td>
      <td>2019-07-11 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-23</td>
      <td>171.64</td>
      <td>2019-07-23 11:30:00+08:00</td>
      <td>2019-07-23 14:00:00+08:00</td>
      <td>1</td>
      <td>02:30:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>SHA</td>
      <td>NRT</td>
      <td>2019-07-26</td>
      <td>394.07</td>
      <td>2019-07-26 14:35:00+08:00</td>
      <td>2019-07-26 18:15:00+09:00</td>
      <td>1</td>
      <td>02:40:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-29</td>
      <td>696.12</td>
      <td>2019-07-29 17:55:00+09:00</td>
      <td>2019-07-30 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>2800</th>
      <td>1901.41</td>
      <td>1 days 20:30:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 11:50:00+02:00</td>
      <td>2019-07-10 16:05:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-23</td>
      <td>171.64</td>
      <td>2019-07-23 21:30:00+08:00</td>
      <td>2019-07-23 23:45:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-26</td>
      <td>394.07</td>
      <td>2019-07-26 14:35:00+08:00</td>
      <td>2019-07-26 18:15:00+09:00</td>
      <td>1</td>
      <td>02:40:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-29</td>
      <td>696.12</td>
      <td>2019-07-29 17:55:00+09:00</td>
      <td>2019-07-30 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>2900</th>
      <td>1901.41</td>
      <td>1 days 20:30:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 21:15:00+02:00</td>
      <td>2019-07-11 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-23</td>
      <td>171.64</td>
      <td>2019-07-23 10:00:00+08:00</td>
      <td>2019-07-23 12:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>SHA</td>
      <td>NRT</td>
      <td>2019-07-26</td>
      <td>394.07</td>
      <td>2019-07-26 14:35:00+08:00</td>
      <td>2019-07-26 18:15:00+09:00</td>
      <td>1</td>
      <td>02:40:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-29</td>
      <td>696.12</td>
      <td>2019-07-29 17:55:00+09:00</td>
      <td>2019-07-30 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>3000</th>
      <td>1901.41</td>
      <td>1 days 20:30:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 21:15:00+02:00</td>
      <td>2019-07-11 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-23</td>
      <td>171.64</td>
      <td>2019-07-23 10:00:00+08:00</td>
      <td>2019-07-23 12:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-26</td>
      <td>394.07</td>
      <td>2019-07-26 14:35:00+08:00</td>
      <td>2019-07-26 18:15:00+09:00</td>
      <td>1</td>
      <td>02:40:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-29</td>
      <td>696.12</td>
      <td>2019-07-29 17:55:00+09:00</td>
      <td>2019-07-30 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>3100</th>
      <td>1901.41</td>
      <td>1 days 20:30:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 21:15:00+02:00</td>
      <td>2019-07-11 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-13</td>
      <td>227.40</td>
      <td>2019-07-13 18:30:00+03:00</td>
      <td>2019-07-14 05:15:00+08:00</td>
      <td>1</td>
      <td>05:45:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-20</td>
      <td>209.11</td>
      <td>2019-07-20 01:50:00+08:00</td>
      <td>2019-07-20 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-23</td>
      <td>171.64</td>
      <td>2019-07-23 17:00:00+08:00</td>
      <td>2019-07-23 19:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>SHA</td>
      <td>NRT</td>
      <td>2019-07-26</td>
      <td>394.07</td>
      <td>2019-07-26 14:35:00+08:00</td>
      <td>2019-07-26 18:15:00+09:00</td>
      <td>1</td>
      <td>02:40:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-29</td>
      <td>696.12</td>
      <td>2019-07-29 17:55:00+09:00</td>
      <td>2019-07-30 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
  </tbody>
</table>

So now it's easy to get the cheapest flights by calling the function for all
possible itineraries:

~~~python
itinerary_df = reduce(pd.DataFrame.append, (find_flights(prices_with_city_df, itinerary_route, 10)
                                           for itinerary_route in itinerary))

itinerary_df \
    .sort_values(['total_price', 'total_flights_duration']) \
    .head(10)
~~~

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>total_price</th>
      <th>total_flights_duration</th>
      <th>Amsterdam_origin</th>
      <th>Amsterdam_destination</th>
      <th>Amsterdam_date</th>
      <th>Amsterdam_price</th>
      <th>Amsterdam_departure_at</th>
      <th>Amsterdam_arrival_at</th>
      <th>Amsterdam_segments</th>
      <th>Amsterdam_duration</th>
      <th>Amsterdam_origin_city</th>
      <th>Amsterdam_destination_city</th>
      <th>Amsterdam_route</th>
      <th>Moscow_origin</th>
      <th>Moscow_destination</th>
      <th>Moscow_date</th>
      <th>Moscow_price</th>
      <th>Moscow_departure_at</th>
      <th>Moscow_arrival_at</th>
      <th>Moscow_segments</th>
      <th>Moscow_duration</th>
      <th>Moscow_origin_city</th>
      <th>Moscow_destination_city</th>
      <th>Moscow_route</th>
      <th>Irkutsk_origin</th>
      <th>Irkutsk_destination</th>
      <th>Irkutsk_date</th>
      <th>Irkutsk_price</th>
      <th>Irkutsk_departure_at</th>
      <th>Irkutsk_arrival_at</th>
      <th>Irkutsk_segments</th>
      <th>Irkutsk_duration</th>
      <th>Irkutsk_origin_city</th>
      <th>Irkutsk_destination_city</th>
      <th>Irkutsk_route</th>
      <th>Beijing_origin</th>
      <th>Beijing_destination</th>
      <th>Beijing_date</th>
      <th>Beijing_price</th>
      <th>Beijing_departure_at</th>
      <th>Beijing_arrival_at</th>
      <th>Beijing_segments</th>
      <th>Beijing_duration</th>
      <th>Beijing_origin_city</th>
      <th>Beijing_destination_city</th>
      <th>Beijing_route</th>
      <th>Shanghai_origin</th>
      <th>Shanghai_destination</th>
      <th>Shanghai_date</th>
      <th>Shanghai_price</th>
      <th>Shanghai_departure_at</th>
      <th>Shanghai_arrival_at</th>
      <th>Shanghai_segments</th>
      <th>Shanghai_duration</th>
      <th>Shanghai_origin_city</th>
      <th>Shanghai_destination_city</th>
      <th>Shanghai_route</th>
      <th>Tokyo_origin</th>
      <th>Tokyo_destination</th>
      <th>Tokyo_date</th>
      <th>Tokyo_price</th>
      <th>Tokyo_departure_at</th>
      <th>Tokyo_arrival_at</th>
      <th>Tokyo_segments</th>
      <th>Tokyo_duration</th>
      <th>Tokyo_origin_city</th>
      <th>Tokyo_destination_city</th>
      <th>Tokyo_route</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>10</th>
      <td>1817.04</td>
      <td>1 days 19:50:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-11</td>
      <td>203.07</td>
      <td>2019-07-11 21:15:00+02:00</td>
      <td>2019-07-12 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 21:50:00+08:00</td>
      <td>2019-07-25 23:55:00+08:00</td>
      <td>1</td>
      <td>02:05:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>40</th>
      <td>1817.04</td>
      <td>1 days 19:50:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-11</td>
      <td>203.07</td>
      <td>2019-07-11 21:15:00+02:00</td>
      <td>2019-07-12 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 21:50:00+08:00</td>
      <td>2019-07-25 23:55:00+08:00</td>
      <td>1</td>
      <td>02:05:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>SHA</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>0</th>
      <td>1817.04</td>
      <td>1 days 20:00:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 21:15:00+02:00</td>
      <td>2019-07-11 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 13:00:00+08:00</td>
      <td>2019-07-25 15:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>70</th>
      <td>1817.04</td>
      <td>1 days 20:00:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 11:50:00+02:00</td>
      <td>2019-07-10 16:05:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 18:00:00+08:00</td>
      <td>2019-07-25 20:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>60</th>
      <td>1817.04</td>
      <td>1 days 20:00:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 11:50:00+02:00</td>
      <td>2019-07-10 16:05:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 13:00:00+08:00</td>
      <td>2019-07-25 15:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>0</th>
      <td>1817.04</td>
      <td>1 days 20:00:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-11</td>
      <td>203.07</td>
      <td>2019-07-11 21:15:00+02:00</td>
      <td>2019-07-12 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 13:00:00+08:00</td>
      <td>2019-07-25 15:15:00+08:00</td>
      <td>1</td>
      <td>02:15:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>10</th>
      <td>1817.04</td>
      <td>1 days 20:05:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 11:50:00+02:00</td>
      <td>2019-07-10 16:05:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 12:00:00+08:00</td>
      <td>2019-07-25 14:20:00+08:00</td>
      <td>1</td>
      <td>02:20:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>40</th>
      <td>1817.04</td>
      <td>1 days 20:05:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-10</td>
      <td>203.07</td>
      <td>2019-07-10 11:50:00+02:00</td>
      <td>2019-07-10 16:05:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 12:00:00+08:00</td>
      <td>2019-07-25 14:20:00+08:00</td>
      <td>1</td>
      <td>02:20:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>SHA</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>70</th>
      <td>1817.04</td>
      <td>1 days 20:05:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-11</td>
      <td>203.07</td>
      <td>2019-07-11 21:15:00+02:00</td>
      <td>2019-07-12 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 18:30:00+08:00</td>
      <td>2019-07-25 20:50:00+08:00</td>
      <td>1</td>
      <td>02:20:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
    <tr>
      <th>60</th>
      <td>1817.04</td>
      <td>1 days 20:05:00</td>
      <td>AMS</td>
      <td>SVO</td>
      <td>2019-07-11</td>
      <td>203.07</td>
      <td>2019-07-11 21:15:00+02:00</td>
      <td>2019-07-12 01:30:00+03:00</td>
      <td>1</td>
      <td>03:15:00</td>
      <td>Amsterdam</td>
      <td>Moscow</td>
      <td>Amsterdam ✈️ Moscow</td>
      <td>DME</td>
      <td>IKT</td>
      <td>2019-07-15</td>
      <td>198.03</td>
      <td>2019-07-15 18:35:00+03:00</td>
      <td>2019-07-16 05:05:00+08:00</td>
      <td>1</td>
      <td>05:30:00</td>
      <td>Moscow</td>
      <td>Irkutsk</td>
      <td>Moscow ✈️ Irkutsk</td>
      <td>IKT</td>
      <td>PEK</td>
      <td>2019-07-22</td>
      <td>154.11</td>
      <td>2019-07-22 01:50:00+08:00</td>
      <td>2019-07-22 04:40:00+08:00</td>
      <td>1</td>
      <td>02:50:00</td>
      <td>Irkutsk</td>
      <td>Beijing</td>
      <td>Irkutsk ✈️ Beijing</td>
      <td>PEK</td>
      <td>SHA</td>
      <td>2019-07-25</td>
      <td>171.64</td>
      <td>2019-07-25 11:00:00+08:00</td>
      <td>2019-07-25 13:20:00+08:00</td>
      <td>1</td>
      <td>02:20:00</td>
      <td>Beijing</td>
      <td>Shanghai</td>
      <td>Beijing ✈️ Shanghai</td>
      <td>PVG</td>
      <td>NRT</td>
      <td>2019-07-28</td>
      <td>394.07</td>
      <td>2019-07-28 17:15:00+08:00</td>
      <td>2019-07-28 20:40:00+09:00</td>
      <td>1</td>
      <td>02:25:00</td>
      <td>Shanghai</td>
      <td>Tokyo</td>
      <td>Shanghai ✈️ Tokyo</td>
      <td>NRT</td>
      <td>AMS</td>
      <td>2019-07-31</td>
      <td>696.12</td>
      <td>2019-07-31 17:55:00+09:00</td>
      <td>2019-08-01 14:40:00+02:00</td>
      <td>2</td>
      <td>1 days 03:45:00</td>
      <td>Tokyo</td>
      <td>Amsterdam</td>
      <td>Tokyo ✈️ Amsterdam</td>
    </tr>
  </tbody>
</table>

### Conclusion

I was able to find the cheapest flights with the minimal duration and the resulting prices
were almost the same as on Google Flights.

As a side-note I'll probably reconsider my trip.

Links:

* [Jupyter notebook](https://gist.github.com/nvbn/4837ee00d77299b22ce15656bc291ef8)
* [Amadeus API](https://developers.amadeus.com/self-service)
