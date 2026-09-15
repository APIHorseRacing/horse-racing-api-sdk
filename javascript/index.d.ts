/**
 * Type declarations for apihorseracing.
 *
 * The envelope is typed; the payloads are not. Sixty-three endpoints return
 * sixty-three shapes, and hand-typing them would produce definitions that drift
 * from the API within a month. `data` is deliberately `unknown` — narrow it
 * where you use it, against the documentation.
 */

export interface ApiMeta {
  request_id: string;
  data_as_of: string;
  plan: string;
  window?: string;
  count?: number;
  next_cursor?: string | null;
  [key: string]: unknown;
}

export interface ApiResponse {
  meta: ApiMeta;
  data: unknown;
}

export declare class ApiError extends Error {
  constructor(message: string, init?: {
    status?: number; code?: string; requestId?: string; docUrl?: string;
  });
  status?: number;
  /** Stable, and the thing to switch on. */
  code?: string;
  requestId?: string;
  docUrl?: string;
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export declare class HorseRacingAPI {
  constructor(opts: ClientOptions);

  /** Walk a paginated endpoint, one record at a time. */
  pages(
    method: (params?: Record<string, unknown>) => Promise<ApiResponse>,
    params?: Record<string, unknown>
  ): AsyncGenerator<unknown, void, unknown>;

  /** Jurisdictions. */
  countries(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Courses. */
  courses(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Coverage. */
  metaCoverage(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search everything. */
  search(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Course profile. */
  coursesCourse(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Filter values. */
  reference(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Report coverage. */
  metaReports(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Find reports. Requires Complete or above. */
  reportsSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Race report. Requires Complete or above. */
  reportsRace(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Today\. */
  racecardsToday(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Upcoming. */
  racecardsUpcoming(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Meetings by date. */
  meetings(date: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Latest results. */
  resultsLatest(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Card by date. */
  racecards(date: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Meeting card. */
  meetingsMeeting(meetingId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Results by date. */
  results(date: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search races. */
  racesSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Finishing order. */
  racesResult(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Market. */
  racesMarket(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Dividends. */
  racesDividends(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Race detail. */
  races(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Field and runners. */
  racesRunners(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Race in context. */
  racesAnalysis(raceId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Form line. */
  horsesForm(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Breeding. */
  horsesPedigree(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** After a break. */
  horsesLayoff(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Head to head. */
  horsesCompare(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search horses. */
  horsesSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Horse profile. */
  horses(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Form trend. */
  horsesTrend(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Statistics. */
  horsesStats(horseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search trainers. */
  trainersSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Recent runners. */
  trainersForm(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By jockey. */
  trainersJockeys(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By course. */
  trainersCourses(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Trainer profile. */
  trainers(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Statistics. */
  trainersStats(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By owner. */
  trainersOwners(trainerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Recent rides. */
  jockeysForm(jockeyId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By trainer. */
  jockeysTrainers(jockeyId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By jockey. */
  ownersJockeys(ownerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By course. */
  ownersCourses(ownerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search jockeys. */
  jockeysSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Jockey profile. */
  jockeys(jockeyId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Statistics. */
  jockeysStats(jockeyId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Search owners. */
  ownersSearch(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Owner profile. */
  owners(ownerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Statistics. */
  ownersStats(ownerId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Subscribe. */
  webhooksSubscribe(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Deliveries. */
  webhooksDeliveries(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Your usage. */
  accountUsage(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Draw bias. Requires the Complete + Analyst plan. */
  coursesDrawBias(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Standard times. Requires the Complete + Analyst plan. */
  coursesStandardTimes(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Favourites. Requires the Complete + Analyst plan. */
  coursesFavourites(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Casualties. Requires the Complete + Analyst plan. */
  coursesCasualties(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Course statistics. Requires the Complete + Analyst plan. */
  coursesStats(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** By going. Requires the Complete + Analyst plan. */
  coursesGoingRecord(courseId: string | number, params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Price performance. Requires the Complete + Analyst plan. */
  marketSpPerformance(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Market movers. Requires the Complete + Analyst plan. */
  marketMovers(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Book percentage. Requires the Complete + Analyst plan. */
  marketOverround(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Ask your own question. Requires the Complete + Analyst plan. */
  analysisAngles(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Days since last run. Requires the Complete + Analyst plan. */
  analysisLayoff(params?: Record<string, unknown>): Promise<ApiResponse>;
  /** Precedents. Requires the Complete + Analyst plan. */
  analysisPrecedents(params?: Record<string, unknown>): Promise<ApiResponse>;
}

export default HorseRacingAPI;
