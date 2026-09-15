/**
 * apihorseracing — the official JavaScript client.
 *
 * Zero dependencies. Uses the platform's own fetch, which exists in Node 18+ and
 * every current browser: a racing API is not worth a dependency tree.
 *
 * Generated from the API's own endpoint registry, so every method here matches a
 * route that exists. Docs: https://apihorseracing.com/documentation
 */

const VERSION = "1.0.0";
const DEFAULT_BASE = "https://api.apihorseracing.com/v1";

export class ApiError extends Error {
  constructor(message, { status, code, requestId, docUrl } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    /** Stable, and the thing to switch on. The message is written for a person. */
    this.code = code;
    this.requestId = requestId;
    this.docUrl = docUrl;
  }
}

export class HorseRacingAPI {
  #key;
  #base;
  #timeout;

  /**
   * @param {object} opts
   * @param {string} opts.apiKey    Read it from the environment; never commit it.
   * @param {string} [opts.baseUrl]
   * @param {number} [opts.timeout] Milliseconds. Statistics endpoints are slow on a cold cache.
   */
  constructor({ apiKey, baseUrl = DEFAULT_BASE, timeout = 30000 } = {}) {
    if (!apiKey) throw new Error("HorseRacingAPI: apiKey is required.");
    this.#key = apiKey;
    this.#base = baseUrl.replace(/\/+$/, "");
    this.#timeout = timeout;
  }

  async #get(path, params = {}) {
    const url = new URL(this.#base + path);

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.#timeout);
    let res;

    try {
      res = await fetch(url, {
        headers: {
          "X-API-Key": this.#key,
          Accept: "application/json",
          "User-Agent": `apihorseracing-js/${VERSION}`,
        },
        signal: ctl.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") throw new ApiError("Request timed out.");
      throw new ApiError(err.message);
    }

    clearTimeout(timer);
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const e = (body && body.error) || {};
      throw new ApiError(e.message || `HTTP ${res.status}`, {
        status: res.status,
        code: e.code,
        requestId: e.request_id,
        docUrl: e.doc_url,
      });
    }

    return body;
  }

  /**
   * Walk a paginated endpoint, yielding one record at a time.
   *
   * The cursor is opaque: it is not an offset, and arithmetic on it will not
   * work. Let this handle it.
   *
   *   for await (const r of api.pages(p => api.racesSearch(p), { region: "GB" })) {}
   */
  async *pages(method, params = {}) {
    let cursor;

    do {
      const page = await method({ ...params, ...(cursor ? { cursor } : {}) });
      const rows = Array.isArray(page.data) ? page.data : [];
      for (const row of rows) yield row;
      cursor = (page.meta && page.meta.next_cursor) || undefined;
    } while (cursor);
  }

  /** Jurisdictions. Every country in the archive with its race count and which fields it publishes. */
  async countries(params = {}) {
    return this.#get(`/v1/countries`, params);
  }

  /** Courses. Every course, with first and last meeting and how many races we hold. */
  async courses(params = {}) {
    return this.#get(`/v1/courses`, params);
  }

  /** Coverage. Totals, the full-order split, and what your own plan can read. */
  async metaCoverage(params = {}) {
    return this.#get(`/v1/meta/coverage`, params);
  }

  /** Search everything. One lookup across horses, trainers, jockeys and courses. */
  async search(params = {}) {
    return this.#get(`/v1/search`, params);
  }

  /** Course profile. Run types, surfaces and distances actually raced there. */
  async coursesCourse(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}`, params);
  }

  /** Filter values. Valid goings, classes and run types, counted from the data. */
  async reference(params = {}) {
    return this.#get(`/v1/reference`, params);
  }

  /** Report coverage. How many race reports exist, from when, and for which jurisdictions. */
  async metaReports(params = {}) {
    return this.#get(`/v1/meta/reports`, params);
  }

  /** Find reports. Search written race reports by date, course or jurisdiction. Requires Complete or above. */
  async reportsSearch(params = {}) {
    return this.#get(`/v1/reports`, params);
  }

  /** Race report. The written account of a single race, with a line for every runner. Requires Complete or above. */
  async reportsRace(raceId, params = {}) {
    return this.#get(`/v1/reports/${encodeURIComponent(raceId)}`, params);
  }

  /** Today\. Every meeting and race today, grouped by course. */
  async racecardsToday(params = {}) {
    return this.#get(`/v1/racecards/today`, params);
  }

  /** Upcoming. Declarations for the next few days. */
  async racecardsUpcoming(params = {}) {
    return this.#get(`/v1/racecards/upcoming`, params);
  }

  /** Meetings by date. One row per course on that day, with going and race count. */
  async meetings(date, params = {}) {
    return this.#get(`/v1/meetings/${encodeURIComponent(date)}`, params);
  }

  /** Latest results. The most recently settled races your plan can read. */
  async resultsLatest(params = {}) {
    return this.#get(`/v1/results/latest`, params);
  }

  /** Card by date. The full card for any date, grouped into meetings. */
  async racecards(date, params = {}) {
    return this.#get(`/v1/racecards/${encodeURIComponent(date)}`, params);
  }

  /** Meeting card. A meeting and every race on it. */
  async meetingsMeeting(meetingId, params = {}) {
    return this.#get(`/v1/meetings/${encodeURIComponent(meetingId)}`, params);
  }

  /** Results by date. Settled races for a date, grouped into meetings. */
  async results(date, params = {}) {
    return this.#get(`/v1/results/${encodeURIComponent(date)}`, params);
  }

  /** Search races. Filter by date, region, run type, going, class, field size. Cursor paginated. */
  async racesSearch(params = {}) {
    return this.#get(`/v1/races/search`, params);
  }

  /** Finishing order. Finishing order, casualties, dividends and prize money. */
  async racesResult(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}/result`, params);
  }

  /** Market. Book percentage, every price, and what moved before the off. */
  async racesMarket(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}/market`, params);
  }

  /** Dividends. Tote returns and prizes, where the jurisdiction published them. */
  async racesDividends(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}/dividends`, params);
  }

  /** Race detail. Conditions, the market, and every runner with its price and position. */
  async races(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}`, params);
  }

  /** Field and runners. The field alone, without the race conditions. */
  async racesRunners(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}/runners`, params);
  }

  /** Race in context. Market shape, movers, and what this course and distance usually produces. */
  async racesAnalysis(raceId, params = {}) {
    return this.#get(`/v1/races/${encodeURIComponent(raceId)}/analysis`, params);
  }

  /** Form line. Recent runs, newest first, clipped to your window. */
  async horsesForm(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}/form`, params);
  }

  /** Breeding. Sire, dam and damsire, plus others by the same sire. */
  async horsesPedigree(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}/pedigree`, params);
  }

  /** After a break. Performance split by days since the last run. */
  async horsesLayoff(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}/layoff`, params);
  }

  /** Head to head. Every race these horses have both run in, and who finished ahead. */
  async horsesCompare(params = {}) {
    return this.#get(`/v1/horses/compare`, params);
  }

  /** Search horses. By name, with career totals attached. */
  async horsesSearch(params = {}) {
    return this.#get(`/v1/horses/search`, params);
  }

  /** Horse profile. Career record and breeding where it has been fetched. */
  async horses(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}`, params);
  }

  /** Form trend. Each run measured against what the market expected of it. */
  async horsesTrend(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}/trend`, params);
  }

  /** Statistics. The standard block, sliceable seventeen ways. */
  async horsesStats(horseId, params = {}) {
    return this.#get(`/v1/horses/${encodeURIComponent(horseId)}/stats`, params);
  }

  /** Search trainers. By name. */
  async trainersSearch(params = {}) {
    return this.#get(`/v1/trainers/search`, params);
  }

  /** Recent runners. Newest first, with the price and the finish. */
  async trainersForm(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}/form`, params);
  }

  /** By jockey. Which riders have paid for this yard. */
  async trainersJockeys(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}/jockeys`, params);
  }

  /** By course. The slice that finds where a yard actually wins. */
  async trainersCourses(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}/courses`, params);
  }

  /** Trainer profile. Runs, wins and the horses sent out. */
  async trainers(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}`, params);
  }

  /** Statistics. Strike rate, A/E and level stakes, by any dimension. */
  async trainersStats(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}/stats`, params);
  }

  /** By owner. Split by who owns the horse. */
  async trainersOwners(trainerId, params = {}) {
    return this.#get(`/v1/trainers/${encodeURIComponent(trainerId)}/owners`, params);
  }

  /** Recent rides. Newest first. */
  async jockeysForm(jockeyId, params = {}) {
    return this.#get(`/v1/jockeys/${encodeURIComponent(jockeyId)}/form`, params);
  }

  /** By trainer. Which yards a rider does well for. */
  async jockeysTrainers(jockeyId, params = {}) {
    return this.#get(`/v1/jockeys/${encodeURIComponent(jockeyId)}/trainers`, params);
  }

  /** By jockey. Riders used, and how they paid. */
  async ownersJockeys(ownerId, params = {}) {
    return this.#get(`/v1/owners/${encodeURIComponent(ownerId)}/jockeys`, params);
  }

  /** By course. Where the colours have done well. */
  async ownersCourses(ownerId, params = {}) {
    return this.#get(`/v1/owners/${encodeURIComponent(ownerId)}/courses`, params);
  }

  /** Search jockeys. By name. */
  async jockeysSearch(params = {}) {
    return this.#get(`/v1/jockeys/search`, params);
  }

  /** Jockey profile. Rides, wins and the span of them. */
  async jockeys(jockeyId, params = {}) {
    return this.#get(`/v1/jockeys/${encodeURIComponent(jockeyId)}`, params);
  }

  /** Statistics. The standard block for a rider. */
  async jockeysStats(jockeyId, params = {}) {
    return this.#get(`/v1/jockeys/${encodeURIComponent(jockeyId)}/stats`, params);
  }

  /** Search owners. By name. Owners are identified by name; the source publishes no id. */
  async ownersSearch(params = {}) {
    return this.#get(`/v1/owners/search`, params);
  }

  /** Owner profile. Runs, wins and horses. */
  async owners(ownerId, params = {}) {
    return this.#get(`/v1/owners/${encodeURIComponent(ownerId)}`, params);
  }

  /** Statistics. The standard block for an owner. */
  async ownersStats(ownerId, params = {}) {
    return this.#get(`/v1/owners/${encodeURIComponent(ownerId)}/stats`, params);
  }

  /** Subscribe. Point a URL at an event and we sign every delivery. */
  async webhooksSubscribe(params = {}) {
    return this.#get(`/v1/webhooks/subscribe`, params);
  }

  /** Deliveries. What we sent, when, and whether it landed. */
  async webhooksDeliveries(params = {}) {
    return this.#get(`/v1/webhooks/deliveries`, params);
  }

  /** Your usage. Requests, errors and every refusal, by endpoint. */
  async accountUsage(params = {}) {
    return this.#get(`/v1/account/usage`, params);
  }

  /** Draw bias. Low, middle and high thirds of the field, per distance. Requires the Complete + Analyst plan. */
  async coursesDrawBias(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/draw-bias`, params);
  }

  /** Standard times. Median winning time per distance, with the implausible ones counted. Requires the Complete + Analyst plan. */
  async coursesStandardTimes(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/standard-times`, params);
  }

  /** Favourites. How the market leader holds up here. Requires the Complete + Analyst plan. */
  async coursesFavourites(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/favourites`, params);
  }

  /** Casualties. Non-completion rates by run type. Requires the Complete + Analyst plan. */
  async coursesCasualties(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/casualties`, params);
  }

  /** Course statistics. The standard block for everything run there. Requires the Complete + Analyst plan. */
  async coursesStats(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/stats`, params);
  }

  /** By going. How the ground changes what wins. Requires the Complete + Analyst plan. */
  async coursesGoingRecord(courseId, params = {}) {
    return this.#get(`/v1/courses/${encodeURIComponent(courseId)}/going-record`, params);
  }

  /** Price performance. What each price band has actually returned. Requires the Complete + Analyst plan. */
  async marketSpPerformance(params = {}) {
    return this.#get(`/v1/market/sp-performance`, params);
  }

  /** Market movers. Whether money moving tells you anything. Requires the Complete + Analyst plan. */
  async marketMovers(params = {}) {
    return this.#get(`/v1/market/movers`, params);
  }

  /** Book percentage. How fat the books have been, by field size and course. Requires the Complete + Analyst plan. */
  async marketOverround(params = {}) {
    return this.#get(`/v1/market/overround`, params);
  }

  /** Ask your own question. Every filter combined freely, returning the standard block. Requires the Complete + Analyst plan. */
  async analysisAngles(params = {}) {
    return this.#get(`/v1/analysis/angles`, params);
  }

  /** Days since last run. Performance by days since the last run, across everything. Requires the Complete + Analyst plan. */
  async analysisLayoff(params = {}) {
    return this.#get(`/v1/analysis/layoff`, params);
  }

  /** Precedents. Races that ran under matching conditions. Requires the Complete + Analyst plan. */
  async analysisPrecedents(params = {}) {
    return this.#get(`/v1/analysis/precedents`, params);
  }
}

export default HorseRacingAPI;
