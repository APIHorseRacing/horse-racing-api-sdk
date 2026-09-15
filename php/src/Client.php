<?php

declare(strict_types=1);

namespace ApiHorseRacing;

/**
 * The official PHP client for the Horse Racing API.
 *
 *     $api = new \ApiHorseRacing\Client(getenv('AHR_KEY'));
 *     $race = $api->races('rc_1JCCEF7', ['include' => 'report']);
 *     echo $race['data']['runners'][0]['horse'];
 *
 * Zero dependencies, no Composer packages required beyond autoloading. Uses cURL
 * where available and falls back to the stream wrapper, so it runs on a plain
 * shared host.
 *
 * Generated from the API's own endpoint registry, so every method here matches a
 * route that exists. Docs: https://apihorseracing.com/documentation
 */
final class Client
{
    public const VERSION = '1.0.0';
    public const DEFAULT_BASE_URL = 'https://api.apihorseracing.com/v1';

    private string $key;
    private string $base;
    private int $timeout;

    /**
     * @param string $apiKey  Read it from the environment; never commit it.
     * @param int    $timeout Seconds. Statistics endpoints are slow on a cold cache.
     */
    public function __construct(string $apiKey, string $baseUrl = self::DEFAULT_BASE_URL,
                                int $timeout = 30)
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException('ApiHorseRacing: an API key is required.');
        }

        $this->key = $apiKey;
        $this->base = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
    }

    /**
     * Walk a paginated endpoint, yielding one record at a time.
     *
     * The cursor is opaque: it is not an offset and arithmetic on it will not
     * work. Let this handle it.
     *
     *     foreach ($api->pages('racesSearch', ['region' => 'GB']) as $race) { }
     *
     * @return \Generator<int, mixed>
     */
    public function pages(string $method, array $params = []): \Generator
    {
        $cursor = null;

        do {
            $page = $this->{$method}($cursor === null ? $params : $params + ['cursor' => $cursor]);

            foreach (($page['data'] ?? []) as $row) {
                yield $row;
            }

            $cursor = $page['meta']['next_cursor'] ?? null;
        } while ($cursor !== null && $cursor !== '');
    }

    /** @param array<string,mixed> $params */
    public function get(string $path, array $params = []): array
    {
        $url = $this->base . $path;
        $clean = array_filter($params, static fn ($v) => $v !== null && $v !== '');

        if ($clean) {
            $url .= '?' . http_build_query($clean);
        }

        $headers = [
            'X-API-Key: ' . $this->key,
            'Accept: application/json',
            'User-Agent: apihorseracing-php/' . self::VERSION,
        ];

        [$status, $body] = \function_exists('curl_init')
            ? $this->viaCurl($url, $headers)
            : $this->viaStream($url, $headers);

        $decoded = json_decode((string)$body, true);

        if ($status < 200 || $status >= 300) {
            $err = $decoded['error'] ?? [];

            throw new ApiException(
                (string)($err['message'] ?? ('HTTP ' . $status)),
                $status,
                (string)($err['code'] ?? ''),
                (string)($err['request_id'] ?? ''),
                (string)($err['doc_url'] ?? '')
            );
        }

        if (!is_array($decoded)) {
            throw new ApiException('The API returned something that was not JSON.', $status);
        }

        return $decoded;
    }

    /** @return array{0:int,1:string} */
    private function viaCurl(string $url, array $headers): array
    {
        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($errno !== 0) {
            throw new ApiException('Could not reach the API: ' . $error);
        }

        return [$status, (string)$body];
    }

    /**
     * The fallback. ignore_errors keeps the body on a 4xx, which is where the
     * error code lives — without it a refusal arrives as an empty string.
     *
     * @return array{0:int,1:string}
     */
    private function viaStream(string $url, array $headers): array
    {
        $ctx = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => implode("\r\n", $headers),
            'timeout'       => $this->timeout,
            'ignore_errors' => true,
        ]]);

        $body = @file_get_contents($url, false, $ctx);

        if ($body === false) {
            throw new ApiException('Could not reach the API.');
        }

        $status = 0;

        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('~^HTTP/\S+\s+(\d{3})~', $h, $m)) {
                $status = (int)$m[1];
            }
        }

        return [$status, (string)$body];
    }

    // ---------------------------------------------------------------- //
    // Endpoints
    // ---------------------------------------------------------------- //

    /** Jurisdictions. Every country in the archive with its race count and which fields it publishes. */
    public function countries(array $params = []): array
    {
        return $this->get('/v1/countries', $params);
    }

    /** Courses. Every course, with first and last meeting and how many races we hold. */
    public function courses(array $params = []): array
    {
        return $this->get('/v1/courses', $params);
    }

    /** Coverage. Totals, the full-order split, and what your own plan can read. */
    public function metaCoverage(array $params = []): array
    {
        return $this->get('/v1/meta/coverage', $params);
    }

    /** Search everything. One lookup across horses, trainers, jockeys and courses. */
    public function search(array $params = []): array
    {
        return $this->get('/v1/search', $params);
    }

    /** Course profile. Run types, surfaces and distances actually raced there. */
    public function coursesCourse(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId), $params);
    }

    /** Filter values. Valid goings, classes and run types, counted from the data. */
    public function reference(array $params = []): array
    {
        return $this->get('/v1/reference', $params);
    }

    /** Report coverage. How many race reports exist, from when, and for which jurisdictions. */
    public function metaReports(array $params = []): array
    {
        return $this->get('/v1/meta/reports', $params);
    }

    /** Find reports. Search written race reports by date, course or jurisdiction. Requires Complete or above. */
    public function reportsSearch(array $params = []): array
    {
        return $this->get('/v1/reports', $params);
    }

    /** Race report. The written account of a single race, with a line for every runner. Requires Complete or above. */
    public function reportsRace(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/reports/' . rawurlencode((string)$raceId), $params);
    }

    /** Today's cards. Every meeting and race today, grouped by course. */
    public function racecardsToday(array $params = []): array
    {
        return $this->get('/v1/racecards/today', $params);
    }

    /** Upcoming. Declarations for the next few days. */
    public function racecardsUpcoming(array $params = []): array
    {
        return $this->get('/v1/racecards/upcoming', $params);
    }

    /** Meetings by date. One row per course on that day, with going and race count. */
    public function meetings(string|int $date, array $params = []): array
    {
        return $this->get('/v1/meetings/' . rawurlencode((string)$date), $params);
    }

    /** Latest results. The most recently settled races your plan can read. */
    public function resultsLatest(array $params = []): array
    {
        return $this->get('/v1/results/latest', $params);
    }

    /** Card by date. The full card for any date, grouped into meetings. */
    public function racecards(string|int $date, array $params = []): array
    {
        return $this->get('/v1/racecards/' . rawurlencode((string)$date), $params);
    }

    /** Meeting card. A meeting and every race on it. */
    public function meetingsMeeting(string|int $meetingId, array $params = []): array
    {
        return $this->get('/v1/meetings/' . rawurlencode((string)$meetingId), $params);
    }

    /** Results by date. Settled races for a date, grouped into meetings. */
    public function results(string|int $date, array $params = []): array
    {
        return $this->get('/v1/results/' . rawurlencode((string)$date), $params);
    }

    /** Search races. Filter by date, region, run type, going, class, field size. Cursor paginated. */
    public function racesSearch(array $params = []): array
    {
        return $this->get('/v1/races/search', $params);
    }

    /** Finishing order. Finishing order, casualties, dividends and prize money. */
    public function racesResult(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId) . '/result', $params);
    }

    /** Market. Book percentage, every price, and what moved before the off. */
    public function racesMarket(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId) . '/market', $params);
    }

    /** Dividends. Tote returns and prizes, where the jurisdiction published them. */
    public function racesDividends(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId) . '/dividends', $params);
    }

    /** Race detail. Conditions, the market, and every runner with its price and position. */
    public function races(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId), $params);
    }

    /** Field and runners. The field alone, without the race conditions. */
    public function racesRunners(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId) . '/runners', $params);
    }

    /** Race in context. Market shape, movers, and what this course and distance usually produces. */
    public function racesAnalysis(string|int $raceId, array $params = []): array
    {
        return $this->get('/v1/races/' . rawurlencode((string)$raceId) . '/analysis', $params);
    }

    /** Form line. Recent runs, newest first, clipped to your window. */
    public function horsesForm(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId) . '/form', $params);
    }

    /** Breeding. Sire, dam and damsire, plus others by the same sire. */
    public function horsesPedigree(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId) . '/pedigree', $params);
    }

    /** After a break. Performance split by days since the last run. */
    public function horsesLayoff(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId) . '/layoff', $params);
    }

    /** Head to head. Every race these horses have both run in, and who finished ahead. */
    public function horsesCompare(array $params = []): array
    {
        return $this->get('/v1/horses/compare', $params);
    }

    /** Search horses. By name, with career totals attached. */
    public function horsesSearch(array $params = []): array
    {
        return $this->get('/v1/horses/search', $params);
    }

    /** Horse profile. Career record and breeding where it has been fetched. */
    public function horses(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId), $params);
    }

    /** Form trend. Each run measured against what the market expected of it. */
    public function horsesTrend(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId) . '/trend', $params);
    }

    /** Statistics. The standard block, sliceable seventeen ways. */
    public function horsesStats(string|int $horseId, array $params = []): array
    {
        return $this->get('/v1/horses/' . rawurlencode((string)$horseId) . '/stats', $params);
    }

    /** Search trainers. By name. */
    public function trainersSearch(array $params = []): array
    {
        return $this->get('/v1/trainers/search', $params);
    }

    /** Recent runners. Newest first, with the price and the finish. */
    public function trainersForm(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId) . '/form', $params);
    }

    /** By jockey. Which riders have paid for this yard. */
    public function trainersJockeys(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId) . '/jockeys', $params);
    }

    /** By course. The slice that finds where a yard actually wins. */
    public function trainersCourses(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId) . '/courses', $params);
    }

    /** Trainer profile. Runs, wins and the horses sent out. */
    public function trainers(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId), $params);
    }

    /** Statistics. Strike rate, A/E and level stakes, by any dimension. */
    public function trainersStats(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId) . '/stats', $params);
    }

    /** By owner. Split by who owns the horse. */
    public function trainersOwners(string|int $trainerId, array $params = []): array
    {
        return $this->get('/v1/trainers/' . rawurlencode((string)$trainerId) . '/owners', $params);
    }

    /** Recent rides. Newest first. */
    public function jockeysForm(string|int $jockeyId, array $params = []): array
    {
        return $this->get('/v1/jockeys/' . rawurlencode((string)$jockeyId) . '/form', $params);
    }

    /** By trainer. Which yards a rider does well for. */
    public function jockeysTrainers(string|int $jockeyId, array $params = []): array
    {
        return $this->get('/v1/jockeys/' . rawurlencode((string)$jockeyId) . '/trainers', $params);
    }

    /** By jockey. Riders used, and how they paid. */
    public function ownersJockeys(string|int $ownerId, array $params = []): array
    {
        return $this->get('/v1/owners/' . rawurlencode((string)$ownerId) . '/jockeys', $params);
    }

    /** By course. Where the colours have done well. */
    public function ownersCourses(string|int $ownerId, array $params = []): array
    {
        return $this->get('/v1/owners/' . rawurlencode((string)$ownerId) . '/courses', $params);
    }

    /** Search jockeys. By name. */
    public function jockeysSearch(array $params = []): array
    {
        return $this->get('/v1/jockeys/search', $params);
    }

    /** Jockey profile. Rides, wins and the span of them. */
    public function jockeys(string|int $jockeyId, array $params = []): array
    {
        return $this->get('/v1/jockeys/' . rawurlencode((string)$jockeyId), $params);
    }

    /** Statistics. The standard block for a rider. */
    public function jockeysStats(string|int $jockeyId, array $params = []): array
    {
        return $this->get('/v1/jockeys/' . rawurlencode((string)$jockeyId) . '/stats', $params);
    }

    /** Search owners. By name. Owners are identified by name; the source publishes no id. */
    public function ownersSearch(array $params = []): array
    {
        return $this->get('/v1/owners/search', $params);
    }

    /** Owner profile. Runs, wins and horses. */
    public function owners(string|int $ownerId, array $params = []): array
    {
        return $this->get('/v1/owners/' . rawurlencode((string)$ownerId), $params);
    }

    /** Statistics. The standard block for an owner. */
    public function ownersStats(string|int $ownerId, array $params = []): array
    {
        return $this->get('/v1/owners/' . rawurlencode((string)$ownerId) . '/stats', $params);
    }

    /** Subscribe. Point a URL at an event and we sign every delivery. */
    public function webhooksSubscribe(array $params = []): array
    {
        return $this->get('/v1/webhooks/subscribe', $params);
    }

    /** Deliveries. What we sent, when, and whether it landed. */
    public function webhooksDeliveries(array $params = []): array
    {
        return $this->get('/v1/webhooks/deliveries', $params);
    }

    /** Your usage. Requests, errors and every refusal, by endpoint. */
    public function accountUsage(array $params = []): array
    {
        return $this->get('/v1/account/usage', $params);
    }

    /** Draw bias. Low, middle and high thirds of the field, per distance. Requires the Complete + Analyst plan. */
    public function coursesDrawBias(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/draw-bias', $params);
    }

    /** Standard times. Median winning time per distance, with the implausible ones counted. Requires the Complete + Analyst plan. */
    public function coursesStandardTimes(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/standard-times', $params);
    }

    /** Favourites. How the market leader holds up here. Requires the Complete + Analyst plan. */
    public function coursesFavourites(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/favourites', $params);
    }

    /** Casualties. Non-completion rates by run type. Requires the Complete + Analyst plan. */
    public function coursesCasualties(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/casualties', $params);
    }

    /** Course statistics. The standard block for everything run there. Requires the Complete + Analyst plan. */
    public function coursesStats(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/stats', $params);
    }

    /** By going. How the ground changes what wins. Requires the Complete + Analyst plan. */
    public function coursesGoingRecord(string|int $courseId, array $params = []): array
    {
        return $this->get('/v1/courses/' . rawurlencode((string)$courseId) . '/going-record', $params);
    }

    /** Price performance. What each price band has actually returned. Requires the Complete + Analyst plan. */
    public function marketSpPerformance(array $params = []): array
    {
        return $this->get('/v1/market/sp-performance', $params);
    }

    /** Market movers. Whether money moving tells you anything. Requires the Complete + Analyst plan. */
    public function marketMovers(array $params = []): array
    {
        return $this->get('/v1/market/movers', $params);
    }

    /** Book percentage. How fat the books have been, by field size and course. Requires the Complete + Analyst plan. */
    public function marketOverround(array $params = []): array
    {
        return $this->get('/v1/market/overround', $params);
    }

    /** Ask your own question. Every filter combined freely, returning the standard block. Requires the Complete + Analyst plan. */
    public function analysisAngles(array $params = []): array
    {
        return $this->get('/v1/analysis/angles', $params);
    }

    /** Days since last run. Performance by days since the last run, across everything. Requires the Complete + Analyst plan. */
    public function analysisLayoff(array $params = []): array
    {
        return $this->get('/v1/analysis/layoff', $params);
    }

    /** Precedents. Races that ran under matching conditions. Requires the Complete + Analyst plan. */
    public function analysisPrecedents(array $params = []): array
    {
        return $this->get('/v1/analysis/precedents', $params);
    }
}
