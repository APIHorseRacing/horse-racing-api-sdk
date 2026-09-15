# Python client for the Horse Racing API

Results, form, starting prices and price movement across Britain, Ireland and
beyond, back to 2017. **63 endpoints, zero dependencies.**

Full API docs: **[https://apihorseracing.com/documentation](https://apihorseracing.com/documentation)**

## Install

```sh
# from this repo, today
pip install "git+https://github.com/APIHorseRacing/horse-racing-api-sdk#subdirectory=python"

# once published to PyPI
pip install apihorseracing
```

Python 3.9 or newer. No third-party packages. No third-party packages.

## Getting a key

Create a free one at **[https://apihorseracing.com](https://apihorseracing.com)** — no card. It reads the same
production database every paid plan reads, held back to between seven days and
twenty-four hours old. It does not expire.

**Read it from an environment variable.** In browser code a key is visible to
anyone who looks; proxy through your own server instead.

## Usage

```python
import os
from apihorseracing import HorseRacingAPI, ApiError

api = HorseRacingAPI(api_key=os.environ["AHR_KEY"])

# what can my key actually read?
cov = api.meta_coverage()
print(cov["meta"]["plan"], cov["meta"]["window"])

# a race, with its written report
race = api.races("rc_1JCCEF7", include="report")
print(race["data"]["report"]["headline"])

# walk a whole season without touching the cursor yourself
for r in api.pages(api.races_search, region="GB", **{"from": "2024-01-01"}):
    print(r["race_date"], r["course"], r["name"])

# errors carry a stable code
try:
    api.trainers_stats("tr_3EDFD3A")
except ApiError as err:
    if err.code == "upgrade_required":
        print("That one needs the Analyst plan.")
```

## The envelope

Every response has `meta` and `data`. `meta.window` is what **your key** can
read — worth checking at startup rather than discovering through an empty
result. A date outside it returns `outside_window` with the exact range.

## Errors

Raised on any non-2xx, carrying the status, a stable `code`, a human `message`
and a `request_id`.

**Switch on `code`, never on `message`.** The code is part of the contract; the
message is written for a person and may be reworded. The `request_id` is what
support needs if you ask about a specific call.

## Pagination

List endpoints return `meta.next_cursor`. It is **opaque** — not an offset, and
arithmetic on it will not work. Pass it back as `cursor` on the next call, or
use the helper shown above.

## Methods

### Reference & coverage

| Method | Endpoint | |
| --- | --- | --- |
| `countries(**params)` | `/v1/countries` |  |
| `courses(**params)` | `/v1/courses` |  |
| `meta_coverage(**params)` | `/v1/meta/coverage` |  |
| `search(**params)` | `/v1/search` |  |
| `courses_course(course_id, **params)` | `/v1/courses/{course_id}` |  |
| `reference(**params)` | `/v1/reference` |  |
| `meta_reports(**params)` | `/v1/meta/reports` |  |

### Race reports

| Method | Endpoint | |
| --- | --- | --- |
| `reports_search(**params)` | `/v1/reports` | Complete |
| `reports_race(race_id, **params)` | `/v1/reports/{race_id}` | Complete |

### Racecards & meetings

| Method | Endpoint | |
| --- | --- | --- |
| `racecards_today(**params)` | `/v1/racecards/today` |  |
| `racecards_upcoming(**params)` | `/v1/racecards/upcoming` |  |
| `meetings(date, **params)` | `/v1/meetings/{date}` |  |
| `results_latest(**params)` | `/v1/results/latest` |  |
| `racecards(date, **params)` | `/v1/racecards/{date}` |  |
| `meetings_meeting(meeting_id, **params)` | `/v1/meetings/{meeting_id}` |  |
| `results(date, **params)` | `/v1/results/{date}` |  |

### Races & markets

| Method | Endpoint | |
| --- | --- | --- |
| `races_search(**params)` | `/v1/races/search` |  |
| `races_result(race_id, **params)` | `/v1/races/{race_id}/result` |  |
| `races_market(race_id, **params)` | `/v1/races/{race_id}/market` |  |
| `races_dividends(race_id, **params)` | `/v1/races/{race_id}/dividends` |  |
| `races(race_id, **params)` | `/v1/races/{race_id}` |  |
| `races_runners(race_id, **params)` | `/v1/races/{race_id}/runners` |  |
| `races_analysis(race_id, **params)` | `/v1/races/{race_id}/analysis` |  |

### Horses & pedigree

| Method | Endpoint | |
| --- | --- | --- |
| `horses_form(horse_id, **params)` | `/v1/horses/{horse_id}/form` |  |
| `horses_pedigree(horse_id, **params)` | `/v1/horses/{horse_id}/pedigree` |  |
| `horses_layoff(horse_id, **params)` | `/v1/horses/{horse_id}/layoff` |  |
| `horses_compare(**params)` | `/v1/horses/compare` |  |
| `horses_search(**params)` | `/v1/horses/search` |  |
| `horses(horse_id, **params)` | `/v1/horses/{horse_id}` |  |
| `horses_trend(horse_id, **params)` | `/v1/horses/{horse_id}/trend` |  |
| `horses_stats(horse_id, **params)` | `/v1/horses/{horse_id}/stats` |  |

### Trainers

| Method | Endpoint | |
| --- | --- | --- |
| `trainers_search(**params)` | `/v1/trainers/search` |  |
| `trainers_form(trainer_id, **params)` | `/v1/trainers/{trainer_id}/form` |  |
| `trainers_jockeys(trainer_id, **params)` | `/v1/trainers/{trainer_id}/jockeys` |  |
| `trainers_courses(trainer_id, **params)` | `/v1/trainers/{trainer_id}/courses` |  |
| `trainers(trainer_id, **params)` | `/v1/trainers/{trainer_id}` |  |
| `trainers_stats(trainer_id, **params)` | `/v1/trainers/{trainer_id}/stats` |  |
| `trainers_owners(trainer_id, **params)` | `/v1/trainers/{trainer_id}/owners` |  |

### Jockeys & owners

| Method | Endpoint | |
| --- | --- | --- |
| `jockeys_form(jockey_id, **params)` | `/v1/jockeys/{jockey_id}/form` |  |
| `jockeys_trainers(jockey_id, **params)` | `/v1/jockeys/{jockey_id}/trainers` |  |
| `owners_jockeys(owner_id, **params)` | `/v1/owners/{owner_id}/jockeys` |  |
| `owners_courses(owner_id, **params)` | `/v1/owners/{owner_id}/courses` |  |
| `jockeys_search(**params)` | `/v1/jockeys/search` |  |
| `jockeys(jockey_id, **params)` | `/v1/jockeys/{jockey_id}` |  |
| `jockeys_stats(jockey_id, **params)` | `/v1/jockeys/{jockey_id}/stats` |  |
| `owners_search(**params)` | `/v1/owners/search` |  |
| `owners(owner_id, **params)` | `/v1/owners/{owner_id}` |  |
| `owners_stats(owner_id, **params)` | `/v1/owners/{owner_id}/stats` |  |

### Webhooks & account

| Method | Endpoint | |
| --- | --- | --- |
| `webhooks_subscribe(**params)` | `/v1/webhooks/subscribe` |  |
| `webhooks_deliveries(**params)` | `/v1/webhooks/deliveries` |  |
| `account_usage(**params)` | `/v1/account/usage` |  |

### Courses & bias

| Method | Endpoint | |
| --- | --- | --- |
| `courses_draw_bias(course_id, **params)` | `/v1/courses/{course_id}/draw-bias` | Analyst |
| `courses_standard_times(course_id, **params)` | `/v1/courses/{course_id}/standard-times` | Analyst |
| `courses_favourites(course_id, **params)` | `/v1/courses/{course_id}/favourites` | Analyst |
| `courses_casualties(course_id, **params)` | `/v1/courses/{course_id}/casualties` | Analyst |
| `courses_stats(course_id, **params)` | `/v1/courses/{course_id}/stats` | Analyst |
| `courses_going_record(course_id, **params)` | `/v1/courses/{course_id}/going-record` | Analyst |

### Market & analysis

| Method | Endpoint | |
| --- | --- | --- |
| `market_sp_performance(**params)` | `/v1/market/sp-performance` | Analyst |
| `market_movers(**params)` | `/v1/market/movers` | Analyst |
| `market_overround(**params)` | `/v1/market/overround` | Analyst |
| `analysis_angles(**params)` | `/v1/analysis/angles` | Analyst |
| `analysis_layoff(**params)` | `/v1/analysis/layoff` | Analyst |
| `analysis_precedents(**params)` | `/v1/analysis/precedents` | Analyst |

## Notes

This client is generated from the API's own endpoint registry — the same source
the routes, the documentation and the OpenAPI spec come from. A method exists
here because the endpoint exists.

The response payloads are deliberately untyped. Sixty-three endpoints return
sixty-three shapes, and hand-written types for each would drift from the API
within a month. Narrow them where you use them, against the documentation.

## Licence

MIT. See [LICENSE](./LICENSE).
