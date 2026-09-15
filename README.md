# APIHorseRacing SDKs

Official client libraries for the **[Horse Racing API](https://apihorseracing.com)** — results,
racecards, form, starting prices and price movement across Britain, Ireland and
beyond, back to 2017.

| Language | Package | Directory |
| --- | --- | --- |
| JavaScript / TypeScript | `@apihorseracing/sdk` (npm) | [`javascript/`](./javascript) |
| Python | `apihorseracing` (PyPI) | [`python/`](./python) |
| PHP | `apihorseracing/sdk` (Composer) | [`php/`](./php) |
| Go | `github.com/apihorseracing/apihorseracing-go` | [`go/`](./go) |

All four cover the same **63 endpoints**, share the same `{ meta, data }`
envelope and cursor pagination, and have **zero third-party dependencies**.

They are generated from the API's own endpoint registry — the same source the
routes, the documentation and the OpenAPI spec come from. A method exists here
because the endpoint exists, not because someone remembered to add it.

## Getting a key

1. Go to **[apihorseracing.com](https://apihorseracing.com)** and create a free key. No card.
2. Sign in, open **Account → API keys**, and create one.
3. Copy it. It is shown once.

A free key reads the **same production database** every paid plan reads, held
back to between seven days and twenty-four hours old. It does not expire and it
never becomes a nag screen. See **[pricing](https://apihorseracing.com/pricing)** for what the paid
plans widen.

**Keep the key out of your source.** Read it from an environment variable. In
browser code a key is visible to anyone who looks — proxy through your own
server instead.

## What this data is, and is not

Results, form, starting prices and the move between opening and off, for
473,485 races back to 2017.

It contains **no predictions, no tips and no ratings**. It also contains no
sectional times, no in-running detail and no winning margins — none of which
exist in this archive, on any plan. The [coverage page](https://apihorseracing.com/data-coverage)
counts every field against every jurisdiction rather than claiming it.


## Quick starts

### JavaScript / TypeScript

```sh
npm install @apihorseracing/sdk
```

```js
import { HorseRacingAPI } from "@apihorseracing/sdk";

const api = new HorseRacingAPI({ apiKey: process.env.AHR_KEY });

const today = await api.racecardsToday({ region: "GB" });
const race  = await api.races("rc_1JCCEF7", { include: "report" });

console.log(race.data.report.headline);
```

### Python

```sh
pip install apihorseracing
```

```python
from apihorseracing import HorseRacingAPI

api = HorseRacingAPI(api_key="ahr_...")

today = api.racecards_today(region="GB")
race  = api.races("rc_1JCCEF7", include="report")

print(race["data"]["report"]["headline"])
```

### PHP

```sh
composer require apihorseracing/sdk
```

```php
$api = new \ApiHorseRacing\Client(getenv('AHR_KEY'));

$today = $api->racecardsToday(['region' => 'GB']);
$race  = $api->races('rc_1JCCEF7', ['include' => 'report']);

echo $race['data']['report']['headline'];
```

### Go

```sh
go get github.com/apihorseracing/apihorseracing-go
```

```go
api := apihorseracing.New(os.Getenv("AHR_KEY"))

race, err := api.Races("rc_1JCCEF7", map[string]string{"include": "report"})
if err != nil {
    log.Fatal(err)
}
```

## The envelope

Every response has the same two keys.

```json
{
  "meta": {
    "request_id": "9aa33686fe2cc46a",
    "data_as_of": "2026-09-14T12:10:46+00:00",
    "plan": "complete",
    "window": "2017 → upcoming"
  },
  "data": { }
}
```

`meta.window` is what **your key** can read, which is worth checking at startup
rather than discovering through an empty result. A date outside it returns
`outside_window` with the exact range, not a blank list.

## Errors

Every client raises on a non-2xx with the same four fields: the HTTP status, a
stable `code`, a human `message` and a `request_id`.

**Switch on `code`, never on `message`.** The code is part of the contract; the
message is written for a person and may be reworded.

| Code | Meaning |
| --- | --- |
| `invalid_key` | The key is wrong, or was rotated. |
| `upgrade_required` | The endpoint needs a plan yours does not reach. |
| `outside_window` | The date is outside what your plan reads. |
| `rate_limited` | Too many per minute. Wait for `Retry-After` and carry on. |
| `quota_exceeded` | The month is spent. Retrying will not help until it resets. |
| `not_found` | No such race, horse or course. |

Full list: [https://apihorseracing.com/documentation/errors](https://apihorseracing.com/documentation/errors)

## Pagination

List endpoints return a `next_cursor` in `meta`. The cursor is **opaque** — it is
not an offset, and arithmetic on it will not work.

Each client has a helper that walks it for you: `pages()` in JavaScript, Python
and PHP, and `NextCursor()` in Go.

## Also available

- **[The complete manual](https://apihorseracing.com/documentation/manual.md)** — every endpoint and
  guide in one markdown file, for pasting into a context window.
- **[MCP server](https://apihorseracing.com/mcp-server)** — live access for an assistant.
- **[OpenAPI](https://apihorseracing.com/openapi.json)** and
  **[Postman](https://apihorseracing.com/postman-collection.json)**.

## Support

Open an issue here for a bug in a client library. For the API itself, use
[https://apihorseracing.com/support](https://apihorseracing.com/support) — it reaches a person.

## Licence

MIT. See [LICENSE](./LICENSE).
