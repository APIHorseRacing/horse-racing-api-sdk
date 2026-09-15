# Horse Racing API — PHP client

Official PHP client for the **[Horse Racing API](https://apihorseracing.com)**: results, racecards,
form, starting prices and price movement across Britain, Ireland and beyond,
back to 2017.

**63 endpoints. Zero dependencies. PHP 8.1+.**

```sh
composer require apihorseracing/horse-racing-api-php
```

Runs on shared hosting: cURL where it is available, the stream wrapper where it
is not.

## Getting a key

Create a free one at **[https://apihorseracing.com](https://apihorseracing.com)** — no card required.

A free key reads the **same production database** every paid plan reads, held
back to between seven days and twenty-four hours old. It does not expire and it
never becomes a nag screen. [Pricing](https://apihorseracing.com/pricing) covers what the paid plans
widen, which is the dates you can reach rather than the endpoints you can call.

**Keep the key out of your source.** Read it from the environment.

## Usage

```php
require 'vendor/autoload.php';

use ApiHorseRacing\Client;
use ApiHorseRacing\ApiException;

$api = new Client(getenv('AHR_KEY'));

// what can this key actually read?
$cov = $api->metaCoverage();
echo $cov['meta']['plan'], ' — ', $cov['meta']['window'], PHP_EOL;

// today's cards
foreach ($api->racecardsToday(['region' => 'GB'])['data'] as $meeting) {
    echo $meeting['course'], ' — ', count($meeting['races']), ' races', PHP_EOL;
}

// one race, with its written report
$race = $api->races('rc_1JCCEF7', ['include' => 'report']);
echo $race['data']['report']['headline'], PHP_EOL;

foreach ($race['data']['runners'] as $r) {
    printf("%-22s %6s  %s\n", $r['horse'], $r['sp'] ?? '-', $r['position'] ?? 'DNF');
}
```

### Pagination

List endpoints return `meta.next_cursor`. The cursor is **opaque** — it is not
an offset, and arithmetic on it will not work.

`pages()` walks it for you:

```php
foreach ($api->pages('racesSearch', ['region' => 'GB', 'from' => '2024-01-01']) as $race) {
    echo $race['race_date'], ' ', $race['course'], PHP_EOL;
}
```

It is a generator, so a season of races does not arrive in memory at once.

### Errors

Any non-2xx throws `ApiException`, carrying the status, a stable `code`, a
message written for a person, and a `request_id`.

```php
try {
    $stats = $api->trainersStats('tr_3EDFD3A');
} catch (ApiException $e) {
    if ($e->code === 'upgrade_required') {
        // the endpoint exists, this key's plan does not reach it
    }

    if ($e->code === 'outside_window') {
        // the date is outside what this plan reads — not missing data
    }

    error_log("{$e->code} — {$e->getMessage()} (request {$e->requestId})");
}
```

**Switch on `code`, never on `getMessage()`.** The code is part of the contract;
the message may be reworded. The `request_id` is what support needs if you ask
about a specific call.

| Code | Meaning |
| --- | --- |
| `invalid_key` | Wrong key, or it was rotated. |
| `upgrade_required` | The endpoint needs a plan this key does not reach. |
| `outside_window` | The date is outside what the plan reads. |
| `rate_limited` | Too many per minute. Wait for `Retry-After`. |
| `quota_exceeded` | The month is spent. Retrying will not help. |
| `not_found` | No such race, horse or course. |

Full list: [https://apihorseracing.com/documentation/errors](https://apihorseracing.com/documentation/errors)

## The envelope

Every response has the same two keys.

```php
[
  'meta' => [
    'request_id' => '9aa33686fe2cc46a',
    'data_as_of' => '2026-09-14T12:10:46+00:00',
    'plan'       => 'complete',
    'window'     => '2017 → upcoming',
  ],
  'data' => [ /* the answer */ ],
]
```

`meta.window` is what **your key** reads. Worth checking at startup rather than
discovering through an empty result — and a date outside it returns
`outside_window` with the exact range, not a blank array. An empty array would
look like missing data, and this is a plan boundary.

## What this data is, and is not

It contains **no predictions, no tips and no ratings**.

It also contains no sectional times, no in-running detail and no winning
margins — none of which exist in this archive, on any plan, at any price. The
[coverage page](https://apihorseracing.com/data-coverage) counts every field against every
jurisdiction from the archive itself rather than claiming it.

## Methods

### Reference & coverage

| Method | Endpoint | Plan |
| --- | --- | --- |
| `countries($params)` | `/v1/countries` |  |
| `courses($params)` | `/v1/courses` |  |
| `metaCoverage($params)` | `/v1/meta/coverage` |  |
| `search($params)` | `/v1/search` |  |
| `coursesCourse($courseId, $params)` | `/v1/courses/{course_id}` |  |
| `reference($params)` | `/v1/reference` |  |
| `metaReports($params)` | `/v1/meta/reports` |  |

### Race reports

| Method | Endpoint | Plan |
| --- | --- | --- |
| `reportsSearch($params)` | `/v1/reports` | Complete |
| `reportsRace($raceId, $params)` | `/v1/reports/{race_id}` | Complete |

### Racecards & meetings

| Method | Endpoint | Plan |
| --- | --- | --- |
| `racecardsToday($params)` | `/v1/racecards/today` |  |
| `racecardsUpcoming($params)` | `/v1/racecards/upcoming` |  |
| `meetings($date, $params)` | `/v1/meetings/{date}` |  |
| `resultsLatest($params)` | `/v1/results/latest` |  |
| `racecards($date, $params)` | `/v1/racecards/{date}` |  |
| `meetingsMeeting($meetingId, $params)` | `/v1/meetings/{meeting_id}` |  |
| `results($date, $params)` | `/v1/results/{date}` |  |

### Races & markets

| Method | Endpoint | Plan |
| --- | --- | --- |
| `racesSearch($params)` | `/v1/races/search` |  |
| `racesResult($raceId, $params)` | `/v1/races/{race_id}/result` |  |
| `racesMarket($raceId, $params)` | `/v1/races/{race_id}/market` |  |
| `racesDividends($raceId, $params)` | `/v1/races/{race_id}/dividends` |  |
| `races($raceId, $params)` | `/v1/races/{race_id}` |  |
| `racesRunners($raceId, $params)` | `/v1/races/{race_id}/runners` |  |
| `racesAnalysis($raceId, $params)` | `/v1/races/{race_id}/analysis` |  |

### Horses & pedigree

| Method | Endpoint | Plan |
| --- | --- | --- |
| `horsesForm($horseId, $params)` | `/v1/horses/{horse_id}/form` |  |
| `horsesPedigree($horseId, $params)` | `/v1/horses/{horse_id}/pedigree` |  |
| `horsesLayoff($horseId, $params)` | `/v1/horses/{horse_id}/layoff` |  |
| `horsesCompare($params)` | `/v1/horses/compare` |  |
| `horsesSearch($params)` | `/v1/horses/search` |  |
| `horses($horseId, $params)` | `/v1/horses/{horse_id}` |  |
| `horsesTrend($horseId, $params)` | `/v1/horses/{horse_id}/trend` |  |
| `horsesStats($horseId, $params)` | `/v1/horses/{horse_id}/stats` |  |

### Trainers

| Method | Endpoint | Plan |
| --- | --- | --- |
| `trainersSearch($params)` | `/v1/trainers/search` |  |
| `trainersForm($trainerId, $params)` | `/v1/trainers/{trainer_id}/form` |  |
| `trainersJockeys($trainerId, $params)` | `/v1/trainers/{trainer_id}/jockeys` |  |
| `trainersCourses($trainerId, $params)` | `/v1/trainers/{trainer_id}/courses` |  |
| `trainers($trainerId, $params)` | `/v1/trainers/{trainer_id}` |  |
| `trainersStats($trainerId, $params)` | `/v1/trainers/{trainer_id}/stats` |  |
| `trainersOwners($trainerId, $params)` | `/v1/trainers/{trainer_id}/owners` |  |

### Jockeys & owners

| Method | Endpoint | Plan |
| --- | --- | --- |
| `jockeysForm($jockeyId, $params)` | `/v1/jockeys/{jockey_id}/form` |  |
| `jockeysTrainers($jockeyId, $params)` | `/v1/jockeys/{jockey_id}/trainers` |  |
| `ownersJockeys($ownerId, $params)` | `/v1/owners/{owner_id}/jockeys` |  |
| `ownersCourses($ownerId, $params)` | `/v1/owners/{owner_id}/courses` |  |
| `jockeysSearch($params)` | `/v1/jockeys/search` |  |
| `jockeys($jockeyId, $params)` | `/v1/jockeys/{jockey_id}` |  |
| `jockeysStats($jockeyId, $params)` | `/v1/jockeys/{jockey_id}/stats` |  |
| `ownersSearch($params)` | `/v1/owners/search` |  |
| `owners($ownerId, $params)` | `/v1/owners/{owner_id}` |  |
| `ownersStats($ownerId, $params)` | `/v1/owners/{owner_id}/stats` |  |

### Webhooks & account

| Method | Endpoint | Plan |
| --- | --- | --- |
| `webhooksSubscribe($params)` | `/v1/webhooks/subscribe` |  |
| `webhooksDeliveries($params)` | `/v1/webhooks/deliveries` |  |
| `accountUsage($params)` | `/v1/account/usage` |  |

### Courses & bias

| Method | Endpoint | Plan |
| --- | --- | --- |
| `coursesDrawBias($courseId, $params)` | `/v1/courses/{course_id}/draw-bias` | Analyst |
| `coursesStandardTimes($courseId, $params)` | `/v1/courses/{course_id}/standard-times` | Analyst |
| `coursesFavourites($courseId, $params)` | `/v1/courses/{course_id}/favourites` | Analyst |
| `coursesCasualties($courseId, $params)` | `/v1/courses/{course_id}/casualties` | Analyst |
| `coursesStats($courseId, $params)` | `/v1/courses/{course_id}/stats` | Analyst |
| `coursesGoingRecord($courseId, $params)` | `/v1/courses/{course_id}/going-record` | Analyst |

### Market & analysis

| Method | Endpoint | Plan |
| --- | --- | --- |
| `marketSpPerformance($params)` | `/v1/market/sp-performance` | Analyst |
| `marketMovers($params)` | `/v1/market/movers` | Analyst |
| `marketOverround($params)` | `/v1/market/overround` | Analyst |
| `analysisAngles($params)` | `/v1/analysis/angles` | Analyst |
| `analysisLayoff($params)` | `/v1/analysis/layoff` | Analyst |
| `analysisPrecedents($params)` | `/v1/analysis/precedents` | Analyst |

## Notes

This client is generated from the API's own endpoint registry — the same source
the routes, the documentation and the OpenAPI spec come from. A method exists
here because the endpoint exists, not because somebody remembered to add it.

Other languages: **[https://github.com/APIHorseRacing/horse-racing-api-sdk](https://github.com/APIHorseRacing/horse-racing-api-sdk)** carries JavaScript, Python and Go.

## Support

Open an issue here for a bug in this client. For the API itself,
[https://apihorseracing.com/support](https://apihorseracing.com/support) reaches a person.

## Licence

MIT. See [LICENSE](./LICENSE).
