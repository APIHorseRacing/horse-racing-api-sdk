# APIHorseRacing SDKs

Official client libraries for the **[Horse Racing API](https://apihorseracing.com)** — results,
racecards, form, starting prices and price movement across Britain, Ireland and
beyond, back to 2017.

| Language | Directory | Package name | Registry |
| --- | --- | --- | --- |
| JavaScript / TypeScript | [`javascript/`](./javascript) | `apihorseracing` | npm |
| Python | [`python/`](./python) | `apihorseracing` | PyPI |
| PHP | [`php/`](./php) | `apihorseracing/sdk` | Packagist |
| Go | [`go/`](./go) | `github.com/APIHorseRacing/horse-racing-api-sdk/go` | none — fetched from this repo |

The package names are registry names, not GitHub paths. Only Go uses the
repository path, because that is how Go modules work.

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


## Installing

**Go and Python install straight from this repo today. JavaScript and PHP need
publishing first**, and that is a limitation of their tooling rather than a
choice: neither npm nor Composer can install from a subdirectory of a git
repository, and each client lives in its own folder here.

| | Works from this repo now | After publishing |
| --- | --- | --- |
| Go | `go get github.com/APIHorseRacing/horse-racing-api-sdk/go` | nothing more — Go has no registry |
| Python | `pip install "git+https://github.com/APIHorseRacing/horse-racing-api-sdk#subdirectory=python"` | `pip install apihorseracing` |
| JavaScript | not directly — see below | `npm install apihorseracing` |
| PHP | not directly — see below | `composer require apihorseracing/sdk` |

**JavaScript and PHP, before publishing.** Copy the folder in, or vendor it:

```sh
# JavaScript — two files, no build step
curl -O https://github.com/APIHorseRacing/horse-racing-api-sdk/raw/main/javascript/index.mjs
curl -O https://github.com/APIHorseRacing/horse-racing-api-sdk/raw/main/javascript/index.d.ts

# PHP — two files, PSR-4 under ApiHorseRacing\
curl -O https://github.com/APIHorseRacing/horse-racing-api-sdk/raw/main/php/src/Client.php
curl -O https://github.com/APIHorseRacing/horse-racing-api-sdk/raw/main/php/src/ApiException.php
```

Both have zero dependencies, so copying them in is a legitimate option rather
than a workaround — there is nothing to resolve.

**To publish properly** you need an account on each registry: npmjs.com,
pypi.org and packagist.org. Packagist reads the repo directly but expects
`composer.json` at the root, so PHP needs either a subtree split to its own
repo or the file moved up. Worth deciding before the first release rather than
after.

## Quick starts

### JavaScript / TypeScript

```sh
npm install apihorseracing
```

```js
import { HorseRacingAPI } from "apihorseracing";

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
go get github.com/APIHorseRacing/horse-racing-api-sdk/go
```

```go
import (
	apihorseracing "github.com/APIHorseRacing/horse-racing-api-sdk/go"
)

api := apihorseracing.New(os.Getenv("AHR_KEY"))

race, err := api.Races("rc_1JCCEF7", map[string]string{"include": "report"})
if err != nil {
	log.Fatal(err)
}
```

The import **must be aliased**. The module path ends in `/go` because the client
lives in a subdirectory of the repo, but the package is called
`apihorseracing` — without the alias the compiler has to guess, and it guesses
`go`.

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
