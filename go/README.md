# Go client for the Horse Racing API

Results, form, starting prices and price movement across Britain, Ireland and
beyond, back to 2017. **63 endpoints, zero dependencies.**

Full API docs: **[https://apihorseracing.com/documentation](https://apihorseracing.com/documentation)**

## Install

```sh
go get github.com/apihorseracing/apihorseracing-go
```

Go 1.21 or newer. No third-party packages.

## Getting a key

Create a free one at **[https://apihorseracing.com](https://apihorseracing.com)** — no card. It reads the same
production database every paid plan reads, held back to between seven days and
twenty-four hours old. It does not expire.

**Read it from an environment variable.** In browser code a key is visible to
anyone who looks; proxy through your own server instead.

## Usage

```go
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"

	apihorseracing "github.com/apihorseracing/apihorseracing-go"
)

func main() {
	api := apihorseracing.New(os.Getenv("AHR_KEY"))

	// a race, with its written report
	race, err := api.Races("rc_1JCCEF7", map[string]string{"include": "report"})
	if err != nil {
		var apiErr *apihorseracing.Error
		if errors.As(err, &apiErr) && apiErr.Code == "upgrade_required" {
			log.Fatal("That one needs a higher plan.")
		}
		log.Fatal(err)
	}

	// Data is raw on purpose — unmarshal it into your own shape
	var out struct {
		Report struct {
			Headline string `json:"headline"`
		} `json:"report"`
	}

	if err := json.Unmarshal(race.Data, &out); err != nil {
		log.Fatal(err)
	}

	fmt.Println(out.Report.Headline)

	// pagination: the cursor is opaque, just pass it back
	cursor := ""
	for {
		p := map[string]string{"region": "GB"}
		if cursor != "" {
			p["cursor"] = cursor
		}

		page, err := api.RacesSearch(p)
		if err != nil {
			log.Fatal(err)
		}

		cursor = page.NextCursor()
		if cursor == "" {
			break
		}
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
| `Countries(params)` | `/v1/countries` |  |
| `Courses(params)` | `/v1/courses` |  |
| `MetaCoverage(params)` | `/v1/meta/coverage` |  |
| `Search(params)` | `/v1/search` |  |
| `CoursesCourse(courseId, params)` | `/v1/courses/{course_id}` |  |
| `Reference(params)` | `/v1/reference` |  |
| `MetaReports(params)` | `/v1/meta/reports` |  |

### Race reports

| Method | Endpoint | |
| --- | --- | --- |
| `ReportsSearch(params)` | `/v1/reports` | Complete |
| `ReportsRace(raceId, params)` | `/v1/reports/{race_id}` | Complete |

### Racecards & meetings

| Method | Endpoint | |
| --- | --- | --- |
| `RacecardsToday(params)` | `/v1/racecards/today` |  |
| `RacecardsUpcoming(params)` | `/v1/racecards/upcoming` |  |
| `Meetings(date, params)` | `/v1/meetings/{date}` |  |
| `ResultsLatest(params)` | `/v1/results/latest` |  |
| `Racecards(date, params)` | `/v1/racecards/{date}` |  |
| `MeetingsMeeting(meetingId, params)` | `/v1/meetings/{meeting_id}` |  |
| `Results(date, params)` | `/v1/results/{date}` |  |

### Races & markets

| Method | Endpoint | |
| --- | --- | --- |
| `RacesSearch(params)` | `/v1/races/search` |  |
| `RacesResult(raceId, params)` | `/v1/races/{race_id}/result` |  |
| `RacesMarket(raceId, params)` | `/v1/races/{race_id}/market` |  |
| `RacesDividends(raceId, params)` | `/v1/races/{race_id}/dividends` |  |
| `Races(raceId, params)` | `/v1/races/{race_id}` |  |
| `RacesRunners(raceId, params)` | `/v1/races/{race_id}/runners` |  |
| `RacesAnalysis(raceId, params)` | `/v1/races/{race_id}/analysis` |  |

### Horses & pedigree

| Method | Endpoint | |
| --- | --- | --- |
| `HorsesForm(horseId, params)` | `/v1/horses/{horse_id}/form` |  |
| `HorsesPedigree(horseId, params)` | `/v1/horses/{horse_id}/pedigree` |  |
| `HorsesLayoff(horseId, params)` | `/v1/horses/{horse_id}/layoff` |  |
| `HorsesCompare(params)` | `/v1/horses/compare` |  |
| `HorsesSearch(params)` | `/v1/horses/search` |  |
| `Horses(horseId, params)` | `/v1/horses/{horse_id}` |  |
| `HorsesTrend(horseId, params)` | `/v1/horses/{horse_id}/trend` |  |
| `HorsesStats(horseId, params)` | `/v1/horses/{horse_id}/stats` |  |

### Trainers

| Method | Endpoint | |
| --- | --- | --- |
| `TrainersSearch(params)` | `/v1/trainers/search` |  |
| `TrainersForm(trainerId, params)` | `/v1/trainers/{trainer_id}/form` |  |
| `TrainersJockeys(trainerId, params)` | `/v1/trainers/{trainer_id}/jockeys` |  |
| `TrainersCourses(trainerId, params)` | `/v1/trainers/{trainer_id}/courses` |  |
| `Trainers(trainerId, params)` | `/v1/trainers/{trainer_id}` |  |
| `TrainersStats(trainerId, params)` | `/v1/trainers/{trainer_id}/stats` |  |
| `TrainersOwners(trainerId, params)` | `/v1/trainers/{trainer_id}/owners` |  |

### Jockeys & owners

| Method | Endpoint | |
| --- | --- | --- |
| `JockeysForm(jockeyId, params)` | `/v1/jockeys/{jockey_id}/form` |  |
| `JockeysTrainers(jockeyId, params)` | `/v1/jockeys/{jockey_id}/trainers` |  |
| `OwnersJockeys(ownerId, params)` | `/v1/owners/{owner_id}/jockeys` |  |
| `OwnersCourses(ownerId, params)` | `/v1/owners/{owner_id}/courses` |  |
| `JockeysSearch(params)` | `/v1/jockeys/search` |  |
| `Jockeys(jockeyId, params)` | `/v1/jockeys/{jockey_id}` |  |
| `JockeysStats(jockeyId, params)` | `/v1/jockeys/{jockey_id}/stats` |  |
| `OwnersSearch(params)` | `/v1/owners/search` |  |
| `Owners(ownerId, params)` | `/v1/owners/{owner_id}` |  |
| `OwnersStats(ownerId, params)` | `/v1/owners/{owner_id}/stats` |  |

### Webhooks & account

| Method | Endpoint | |
| --- | --- | --- |
| `WebhooksSubscribe(params)` | `/v1/webhooks/subscribe` |  |
| `WebhooksDeliveries(params)` | `/v1/webhooks/deliveries` |  |
| `AccountUsage(params)` | `/v1/account/usage` |  |

### Courses & bias

| Method | Endpoint | |
| --- | --- | --- |
| `CoursesDrawBias(courseId, params)` | `/v1/courses/{course_id}/draw-bias` | Analyst |
| `CoursesStandardTimes(courseId, params)` | `/v1/courses/{course_id}/standard-times` | Analyst |
| `CoursesFavourites(courseId, params)` | `/v1/courses/{course_id}/favourites` | Analyst |
| `CoursesCasualties(courseId, params)` | `/v1/courses/{course_id}/casualties` | Analyst |
| `CoursesStats(courseId, params)` | `/v1/courses/{course_id}/stats` | Analyst |
| `CoursesGoingRecord(courseId, params)` | `/v1/courses/{course_id}/going-record` | Analyst |

### Market & analysis

| Method | Endpoint | |
| --- | --- | --- |
| `MarketSpPerformance(params)` | `/v1/market/sp-performance` | Analyst |
| `MarketMovers(params)` | `/v1/market/movers` | Analyst |
| `MarketOverround(params)` | `/v1/market/overround` | Analyst |
| `AnalysisAngles(params)` | `/v1/analysis/angles` | Analyst |
| `AnalysisLayoff(params)` | `/v1/analysis/layoff` | Analyst |
| `AnalysisPrecedents(params)` | `/v1/analysis/precedents` | Analyst |

## Notes

This client is generated from the API's own endpoint registry — the same source
the routes, the documentation and the OpenAPI spec come from. A method exists
here because the endpoint exists.

The response payloads are deliberately untyped. Sixty-three endpoints return
sixty-three shapes, and hand-written types for each would drift from the API
within a month. Narrow them where you use them, against the documentation.

## Licence

MIT. See [LICENSE](./LICENSE).
