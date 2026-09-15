"""
apihorseracing — the official Python client for the Horse Racing API.

    from apihorseracing import HorseRacingAPI

    api = HorseRacingAPI(api_key="ahr_...")
    card = api.racecards_today(region="GB")
    race = api.races("rc_1JCCEF7", include="report")
    print(race["data"]["runners"][0]["horse"])

Zero dependencies, standard library only. A racing API is not worth a dependency
tree, and a client with none can be audited in an afternoon.

Generated from the API's own endpoint registry, so every method here matches a
route that exists. Docs: https://apihorseracing.com/documentation
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterator, Optional

__version__ = "1.0.0"
__all__ = ["HorseRacingAPI", "ApiError"]

DEFAULT_BASE_URL = "https://api.apihorseracing.com/v1"


class ApiError(Exception):
    """Any non-2xx response, or a transport failure.

    ``code`` is stable and worth branching on. ``message`` is written for a
    person and may be reworded.
    """

    def __init__(self, message: str, status: Optional[int] = None,
                 code: Optional[str] = None, request_id: Optional[str] = None,
                 doc_url: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id
        self.doc_url = doc_url


class HorseRacingAPI:
    """Client for the Horse Racing API.

    Args:
        api_key:  Your key. Read it from the environment; never commit it.
        base_url: Override the API base URL.
        timeout:  Seconds. Statistics endpoints are slow on a cold cache.
    """

    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL,
                 timeout: float = 30.0):
        if not api_key:
            raise ValueError("HorseRacingAPI: api_key is required.")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # ------------------------------------------------------------------ #

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = self.base_url + path

        if params:
            clean = {k: v for k, v in params.items() if v is not None and v != ""}
            if clean:
                url += "?" + urllib.parse.urlencode(clean)

        req = urllib.request.Request(url, method="GET")
        req.add_header("X-API-Key", self.api_key)
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", "apihorseracing-python/" + __version__)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")

            try:
                err = (json.loads(raw) or {}).get("error", {})
            except ValueError:
                err = {}

            raise ApiError(
                err.get("message") or f"HTTP {exc.code}",
                status=exc.code,
                code=err.get("code"),
                request_id=err.get("request_id"),
                doc_url=err.get("doc_url"),
            ) from None
        except urllib.error.URLError as exc:
            raise ApiError(f"Could not reach the API: {exc.reason}") from None

    def pages(self, method, **params) -> Iterator[Any]:
        """Walk a paginated endpoint, yielding one record at a time.

        The cursor is opaque: it is not an offset and arithmetic on it will not
        work. Let this handle it.

            for race in api.pages(api.races_search, region="GB"):
                ...
        """
        cursor = None

        while True:
            page = method(**({**params, "cursor": cursor} if cursor else params))
            rows = page.get("data")

            if isinstance(rows, list):
                for row in rows:
                    yield row

            cursor = (page.get("meta") or {}).get("next_cursor")

            if not cursor:
                return

    # ------------------------------------------------------------------ #
    # Endpoints
    # ------------------------------------------------------------------ #

    def countries(self, **params: Any) -> Dict[str, Any]:
        """Jurisdictions. Every country in the archive with its race count and which fields it publishes."""
        return self._get("/v1/countries", params)

    def courses(self, **params: Any) -> Dict[str, Any]:
        """Courses. Every course, with first and last meeting and how many races we hold."""
        return self._get("/v1/courses", params)

    def meta_coverage(self, **params: Any) -> Dict[str, Any]:
        """Coverage. Totals, the full-order split, and what your own plan can read."""
        return self._get("/v1/meta/coverage", params)

    def search(self, **params: Any) -> Dict[str, Any]:
        """Search everything. One lookup across horses, trainers, jockeys and courses."""
        return self._get("/v1/search", params)

    def courses_course(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Course profile. Run types, surfaces and distances actually raced there."""
        return self._get(f"/v1/courses/{course_id}", params)

    def reference(self, **params: Any) -> Dict[str, Any]:
        """Filter values. Valid goings, classes and run types, counted from the data."""
        return self._get("/v1/reference", params)

    def meta_reports(self, **params: Any) -> Dict[str, Any]:
        """Report coverage. How many race reports exist, from when, and for which jurisdictions."""
        return self._get("/v1/meta/reports", params)

    def reports_search(self, **params: Any) -> Dict[str, Any]:
        """Find reports. Search written race reports by date, course or jurisdiction. Requires Complete or above."""
        return self._get("/v1/reports", params)

    def reports_race(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Race report. The written account of a single race, with a line for every runner. Requires Complete or above."""
        return self._get(f"/v1/reports/{race_id}", params)

    def racecards_today(self, **params: Any) -> Dict[str, Any]:
        """Today's cards. Every meeting and race today, grouped by course."""
        return self._get("/v1/racecards/today", params)

    def racecards_upcoming(self, **params: Any) -> Dict[str, Any]:
        """Upcoming. Declarations for the next few days."""
        return self._get("/v1/racecards/upcoming", params)

    def meetings(self, date: str | int, **params: Any) -> Dict[str, Any]:
        """Meetings by date. One row per course on that day, with going and race count."""
        return self._get(f"/v1/meetings/{date}", params)

    def results_latest(self, **params: Any) -> Dict[str, Any]:
        """Latest results. The most recently settled races your plan can read."""
        return self._get("/v1/results/latest", params)

    def racecards(self, date: str | int, **params: Any) -> Dict[str, Any]:
        """Card by date. The full card for any date, grouped into meetings."""
        return self._get(f"/v1/racecards/{date}", params)

    def meetings_meeting(self, meeting_id: str | int, **params: Any) -> Dict[str, Any]:
        """Meeting card. A meeting and every race on it."""
        return self._get(f"/v1/meetings/{meeting_id}", params)

    def results(self, date: str | int, **params: Any) -> Dict[str, Any]:
        """Results by date. Settled races for a date, grouped into meetings."""
        return self._get(f"/v1/results/{date}", params)

    def races_search(self, **params: Any) -> Dict[str, Any]:
        """Search races. Filter by date, region, run type, going, class, field size. Cursor paginated."""
        return self._get("/v1/races/search", params)

    def races_result(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Finishing order. Finishing order, casualties, dividends and prize money."""
        return self._get(f"/v1/races/{race_id}/result", params)

    def races_market(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Market. Book percentage, every price, and what moved before the off."""
        return self._get(f"/v1/races/{race_id}/market", params)

    def races_dividends(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Dividends. Tote returns and prizes, where the jurisdiction published them."""
        return self._get(f"/v1/races/{race_id}/dividends", params)

    def races(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Race detail. Conditions, the market, and every runner with its price and position."""
        return self._get(f"/v1/races/{race_id}", params)

    def races_runners(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Field and runners. The field alone, without the race conditions."""
        return self._get(f"/v1/races/{race_id}/runners", params)

    def races_analysis(self, race_id: str | int, **params: Any) -> Dict[str, Any]:
        """Race in context. Market shape, movers, and what this course and distance usually produces."""
        return self._get(f"/v1/races/{race_id}/analysis", params)

    def horses_form(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """Form line. Recent runs, newest first, clipped to your window."""
        return self._get(f"/v1/horses/{horse_id}/form", params)

    def horses_pedigree(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """Breeding. Sire, dam and damsire, plus others by the same sire."""
        return self._get(f"/v1/horses/{horse_id}/pedigree", params)

    def horses_layoff(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """After a break. Performance split by days since the last run."""
        return self._get(f"/v1/horses/{horse_id}/layoff", params)

    def horses_compare(self, **params: Any) -> Dict[str, Any]:
        """Head to head. Every race these horses have both run in, and who finished ahead."""
        return self._get("/v1/horses/compare", params)

    def horses_search(self, **params: Any) -> Dict[str, Any]:
        """Search horses. By name, with career totals attached."""
        return self._get("/v1/horses/search", params)

    def horses(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """Horse profile. Career record and breeding where it has been fetched."""
        return self._get(f"/v1/horses/{horse_id}", params)

    def horses_trend(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """Form trend. Each run measured against what the market expected of it."""
        return self._get(f"/v1/horses/{horse_id}/trend", params)

    def horses_stats(self, horse_id: str | int, **params: Any) -> Dict[str, Any]:
        """Statistics. The standard block, sliceable seventeen ways."""
        return self._get(f"/v1/horses/{horse_id}/stats", params)

    def trainers_search(self, **params: Any) -> Dict[str, Any]:
        """Search trainers. By name."""
        return self._get("/v1/trainers/search", params)

    def trainers_form(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """Recent runners. Newest first, with the price and the finish."""
        return self._get(f"/v1/trainers/{trainer_id}/form", params)

    def trainers_jockeys(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """By jockey. Which riders have paid for this yard."""
        return self._get(f"/v1/trainers/{trainer_id}/jockeys", params)

    def trainers_courses(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """By course. The slice that finds where a yard actually wins."""
        return self._get(f"/v1/trainers/{trainer_id}/courses", params)

    def trainers(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """Trainer profile. Runs, wins and the horses sent out."""
        return self._get(f"/v1/trainers/{trainer_id}", params)

    def trainers_stats(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """Statistics. Strike rate, A/E and level stakes, by any dimension."""
        return self._get(f"/v1/trainers/{trainer_id}/stats", params)

    def trainers_owners(self, trainer_id: str | int, **params: Any) -> Dict[str, Any]:
        """By owner. Split by who owns the horse."""
        return self._get(f"/v1/trainers/{trainer_id}/owners", params)

    def jockeys_form(self, jockey_id: str | int, **params: Any) -> Dict[str, Any]:
        """Recent rides. Newest first."""
        return self._get(f"/v1/jockeys/{jockey_id}/form", params)

    def jockeys_trainers(self, jockey_id: str | int, **params: Any) -> Dict[str, Any]:
        """By trainer. Which yards a rider does well for."""
        return self._get(f"/v1/jockeys/{jockey_id}/trainers", params)

    def owners_jockeys(self, owner_id: str | int, **params: Any) -> Dict[str, Any]:
        """By jockey. Riders used, and how they paid."""
        return self._get(f"/v1/owners/{owner_id}/jockeys", params)

    def owners_courses(self, owner_id: str | int, **params: Any) -> Dict[str, Any]:
        """By course. Where the colours have done well."""
        return self._get(f"/v1/owners/{owner_id}/courses", params)

    def jockeys_search(self, **params: Any) -> Dict[str, Any]:
        """Search jockeys. By name."""
        return self._get("/v1/jockeys/search", params)

    def jockeys(self, jockey_id: str | int, **params: Any) -> Dict[str, Any]:
        """Jockey profile. Rides, wins and the span of them."""
        return self._get(f"/v1/jockeys/{jockey_id}", params)

    def jockeys_stats(self, jockey_id: str | int, **params: Any) -> Dict[str, Any]:
        """Statistics. The standard block for a rider."""
        return self._get(f"/v1/jockeys/{jockey_id}/stats", params)

    def owners_search(self, **params: Any) -> Dict[str, Any]:
        """Search owners. By name. Owners are identified by name; the source publishes no id."""
        return self._get("/v1/owners/search", params)

    def owners(self, owner_id: str | int, **params: Any) -> Dict[str, Any]:
        """Owner profile. Runs, wins and horses."""
        return self._get(f"/v1/owners/{owner_id}", params)

    def owners_stats(self, owner_id: str | int, **params: Any) -> Dict[str, Any]:
        """Statistics. The standard block for an owner."""
        return self._get(f"/v1/owners/{owner_id}/stats", params)

    def webhooks_subscribe(self, **params: Any) -> Dict[str, Any]:
        """Subscribe. Point a URL at an event and we sign every delivery."""
        return self._get("/v1/webhooks/subscribe", params)

    def webhooks_deliveries(self, **params: Any) -> Dict[str, Any]:
        """Deliveries. What we sent, when, and whether it landed."""
        return self._get("/v1/webhooks/deliveries", params)

    def account_usage(self, **params: Any) -> Dict[str, Any]:
        """Your usage. Requests, errors and every refusal, by endpoint."""
        return self._get("/v1/account/usage", params)

    def courses_draw_bias(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Draw bias. Low, middle and high thirds of the field, per distance. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/draw-bias", params)

    def courses_standard_times(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Standard times. Median winning time per distance, with the implausible ones counted. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/standard-times", params)

    def courses_favourites(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Favourites. How the market leader holds up here. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/favourites", params)

    def courses_casualties(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Casualties. Non-completion rates by run type. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/casualties", params)

    def courses_stats(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """Course statistics. The standard block for everything run there. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/stats", params)

    def courses_going_record(self, course_id: str | int, **params: Any) -> Dict[str, Any]:
        """By going. How the ground changes what wins. Requires the Complete + Analyst plan."""
        return self._get(f"/v1/courses/{course_id}/going-record", params)

    def market_sp_performance(self, **params: Any) -> Dict[str, Any]:
        """Price performance. What each price band has actually returned. Requires the Complete + Analyst plan."""
        return self._get("/v1/market/sp-performance", params)

    def market_movers(self, **params: Any) -> Dict[str, Any]:
        """Market movers. Whether money moving tells you anything. Requires the Complete + Analyst plan."""
        return self._get("/v1/market/movers", params)

    def market_overround(self, **params: Any) -> Dict[str, Any]:
        """Book percentage. How fat the books have been, by field size and course. Requires the Complete + Analyst plan."""
        return self._get("/v1/market/overround", params)

    def analysis_angles(self, **params: Any) -> Dict[str, Any]:
        """Ask your own question. Every filter combined freely, returning the standard block. Requires the Complete + Analyst plan."""
        return self._get("/v1/analysis/angles", params)

    def analysis_layoff(self, **params: Any) -> Dict[str, Any]:
        """Days since last run. Performance by days since the last run, across everything. Requires the Complete + Analyst plan."""
        return self._get("/v1/analysis/layoff", params)

    def analysis_precedents(self, **params: Any) -> Dict[str, Any]:
        """Precedents. Races that ran under matching conditions. Requires the Complete + Analyst plan."""
        return self._get("/v1/analysis/precedents", params)
