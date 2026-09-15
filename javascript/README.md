# JavaScript / TypeScript client for the Horse Racing API

Results, form, starting prices and price movement across Britain, Ireland and
beyond, back to 2017. **63 endpoints, zero dependencies.**

Full API docs: **[https://apihorseracing.com/documentation](https://apihorseracing.com/documentation)**

## Install

```sh
npm install @apihorseracing/sdk
```

Node 18 or newer, or any current browser. No third-party packages.

## Getting a key

Create a free one at **[https://apihorseracing.com](https://apihorseracing.com)** — no card. It reads the same
production database every paid plan reads, held back to between seven days and
twenty-four hours old. It does not expire.

**Read it from an environment variable.** In browser code a key is visible to
anyone who looks; proxy through your own server instead.

## Usage

```js
import { HorseRacingAPI, ApiError } from "@apihorseracing/sdk";

const api = new HorseRacingAPI({ apiKey: process.env.AHR_KEY });

// what can my key actually read?
const cov = await api.metaCoverage();
console.log(cov.meta.plan, cov.meta.window);

// a race, with its written report
const race = await api.races("rc_1JCCEF7", { include: "report" });
console.log(race.data.report.headline);

// walk a whole season without touching the cursor yourself
for await (const r of api.pages(p => api.racesSearch(p), { region: "GB", from: "2024-01-01" })) {
  console.log(r.race_date, r.course, r.name);
}

// errors carry a stable code
try {
  await api.trainersStats("tr_3EDFD3A");
} catch (err) {
  if (err instanceof ApiError && err.code === "upgrade_required") {
    console.log("That one needs the Analyst plan.");
  }
}
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
| `countries(params)` | `/v1/countries` |  |
| `courses(params)` | `/v1/courses` |  |
| `metaCoverage(params)` | `/v1/meta/coverage` |  |
| `search(params)` | `/v1/search` |  |
| `coursesCourse(courseId, params)` | `/v1/courses/{course_id}` |  |
| `reference(params)` | `/v1/reference` |  |
| `metaReports(params)` | `/v1/meta/reports` |  |

### Race reports

| Method | Endpoint | |
| --- | --- | --- |
| `reportsSearch(params)` | `/v1/reports` | Complete |
| `reportsRace(raceId, params)` | `/v1/reports/{race_id}` | Complete |

### Racecards & meetings

| Method | Endpoint | |
| --- | --- | --- |
| `racecardsToday(params)` | `/v1/racecards/today` |  |
| `racecardsUpcoming(params)` | `/v1/racecards/upcoming` |  |
| `meetings(date, params)` | `/v1/meetings/{date}` |  |
| `resultsLatest(params)` | `/v1/results/latest` |  |
| `racecards(date, params)` | `/v1/racecards/{date}` |  |
| `meetingsMeeting(meetingId, params)` | `/v1/meetings/{meeting_id}` |  |
| `results(date, params)` | `/v1/results/{date}` |  |

### Races & markets

| Method | Endpoint | |
| --- | --- | --- |
| `racesSearch(params)` | `/v1/races/search` |  |
| `racesResult(raceId, params)` | `/v1/races/{race_id}/result` |  |
| `racesMarket(raceId, params)` | `/v1/races/{race_id}/market` |  |
| `racesDividends(raceId, params)` | `/v1/races/{race_id}/dividends` |  |
| `races(raceId, params)` | `/v1/races/{race_id}` |  |
| `racesRunners(raceId, params)` | `/v1/races/{race_id}/runners` |  |
| `racesAnalysis(raceId, params)` | `/v1/races/{race_id}/analysis` |  |

### Horses & pedigree

| Method | Endpoint | |
| --- | --- | --- |
| `horsesForm(horseId, params)` | `/v1/horses/{horse_id}/form` |  |
| `horsesPedigree(horseId, params)` | `/v1/horses/{horse_id}/pedigree` |  |
| `horsesLayoff(horseId, params)` | `/v1/horses/{horse_id}/layoff` |  |
| `horsesCompare(params)` | `/v1/horses/compare` |  |
| `horsesSearch(params)` | `/v1/horses/search` |  |
| `horses(horseId, params)` | `/v1/horses/{horse_id}` |  |
| `horsesTrend(horseId, params)` | `/v1/horses/{horse_id}/trend` |  |
| `horsesStats(horseId, params)` | `/v1/horses/{horse_id}/stats` |  |

### Trainers

| Method | Endpoint | |
| --- | --- | --- |
| `trainersSearch(params)` | `/v1/trainers/search` |  |
| `trainersForm(trainerId, params)` | `/v1/trainers/{trainer_id}/form` |  |
| `trainersJockeys(trainerId, params)` | `/v1/trainers/{trainer_id}/jockeys` |  |
| `trainersCourses(trainerId, params)` | `/v1/trainers/{trainer_id}/courses` |  |
| `trainers(trainerId, params)` | `/v1/trainers/{trainer_id}` |  |
| `trainersStats(trainerId, params)` | `/v1/trainers/{trainer_id}/stats` |  |
| `trainersOwners(trainerId, params)` | `/v1/trainers/{trainer_id}/owners` |  |

### Jockeys & owners

| Method | Endpoint | |
| --- | --- | --- |
| `jockeysForm(jockeyId, params)` | `/v1/jockeys/{jockey_id}/form` |  |
| `jockeysTrainers(jockeyId, params)` | `/v1/jockeys/{jockey_id}/trainers` |  |
| `ownersJockeys(ownerId, params)` | `/v1/owners/{owner_id}/jockeys` |  |
| `ownersCourses(ownerId, params)` | `/v1/owners/{owner_id}/courses` |  |
| `jockeysSearch(params)` | `/v1/jockeys/search` |  |
| `jockeys(jockeyId, params)` | `/v1/jockeys/{jockey_id}` |  |
| `jockeysStats(jockeyId, params)` | `/v1/jockeys/{jockey_id}/stats` |  |
| `ownersSearch(params)` | `/v1/owners/search` |  |
| `owners(ownerId, params)` | `/v1/owners/{owner_id}` |  |
| `ownersStats(ownerId, params)` | `/v1/owners/{owner_id}/stats` |  |

### Webhooks & account

| Method | Endpoint | |
| --- | --- | --- |
| `webhooksSubscribe(params)` | `/v1/webhooks/subscribe` |  |
| `webhooksDeliveries(params)` | `/v1/webhooks/deliveries` |  |
| `accountUsage(params)` | `/v1/account/usage` |  |

### Courses & bias

| Method | Endpoint | |
| --- | --- | --- |
| `coursesDrawBias(courseId, params)` | `/v1/courses/{course_id}/draw-bias` | Analyst |
| `coursesStandardTimes(courseId, params)` | `/v1/courses/{course_id}/standard-times` | Analyst |
| `coursesFavourites(courseId, params)` | `/v1/courses/{course_id}/favourites` | Analyst |
| `coursesCasualties(courseId, params)` | `/v1/courses/{course_id}/casualties` | Analyst |
| `coursesStats(courseId, params)` | `/v1/courses/{course_id}/stats` | Analyst |
| `coursesGoingRecord(courseId, params)` | `/v1/courses/{course_id}/going-record` | Analyst |

### Market & analysis

| Method | Endpoint | |
| --- | --- | --- |
| `marketSpPerformance(params)` | `/v1/market/sp-performance` | Analyst |
| `marketMovers(params)` | `/v1/market/movers` | Analyst |
| `marketOverround(params)` | `/v1/market/overround` | Analyst |
| `analysisAngles(params)` | `/v1/analysis/angles` | Analyst |
| `analysisLayoff(params)` | `/v1/analysis/layoff` | Analyst |
| `analysisPrecedents(params)` | `/v1/analysis/precedents` | Analyst |

## Notes

This client is generated from the API's own endpoint registry — the same source
the routes, the documentation and the OpenAPI spec come from. A method exists
here because the endpoint exists.

The response payloads are deliberately untyped. Sixty-three endpoints return
sixty-three shapes, and hand-written types for each would drift from the API
within a month. Narrow them where you use them, against the documentation.

## Licence

MIT. See [LICENSE](./LICENSE).
