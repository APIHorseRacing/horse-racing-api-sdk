// Package apihorseracing is the official Go client for the Horse Racing API:
// results, form, starting prices and price movement back to 2017.
//
//	api := apihorseracing.New("ahr_...")
//	race, err := api.Races("rc_1JCCEF7", map[string]string{"include": "report"})
//
// Zero dependencies, standard library only. Generated from the API's own
// endpoint registry, so every method here matches a route that exists.
//
// Import:
//
//	go get github.com/APIHorseRacing/horse-racing-api-sdk/go
//
// Docs: https://apihorseracing.com/documentation
package apihorseracing

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Version of this client, sent as the User-Agent.
const Version = "1.0.0"

// DefaultBaseURL is the production API.
const DefaultBaseURL = "https://api.apihorseracing.com/v1"

// Response is the envelope every endpoint returns.
//
// Data is deliberately json.RawMessage: sixty-three endpoints return
// sixty-three shapes, and a generated struct for each would drift from the API
// within a month. Unmarshal it into your own type where you use it.
type Response struct {
	Meta map[string]any  `json:"meta"`
	Data json.RawMessage `json:"data"`
}

// Error is any non-2xx response.
//
// Code is stable and worth switching on. Message is written for a person and
// may be reworded.
type Error struct {
	Status    int
	Code      string
	Message   string
	RequestID string
	DocURL    string
}

func (e *Error) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("apihorseracing: %s (%s)", e.Message, e.Code)
	}
	return "apihorseracing: " + e.Message
}

// Client talks to the API. Safe for concurrent use.
type Client struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

// New returns a client with sensible defaults.
//
// The timeout is thirty seconds because the statistics endpoints are slow on a
// cold cache; override HTTP if that does not suit you.
func New(apiKey string) *Client {
	return &Client{
		APIKey:  apiKey,
		BaseURL: DefaultBaseURL,
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) get(path string, params map[string]string) (*Response, error) {
	if c.APIKey == "" {
		return nil, &Error{Message: "an API key is required"}
	}

	u := strings.TrimRight(c.BaseURL, "/") + path

	if len(params) > 0 {
		q := url.Values{}
		for k, v := range params {
			if v != "" {
				q.Set(k, v)
			}
		}
		if len(q) > 0 {
			u += "?" + q.Encode()
		}
	}

	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-API-Key", c.APIKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "apihorseracing-go/"+Version)

	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var wrap struct {
			Error struct {
				Code      string `json:"code"`
				Message   string `json:"message"`
				RequestID string `json:"request_id"`
				DocURL    string `json:"doc_url"`
			} `json:"error"`
		}

		_ = json.Unmarshal(body, &wrap)

		msg := wrap.Error.Message
		if msg == "" {
			msg = fmt.Sprintf("HTTP %d", res.StatusCode)
		}

		return nil, &Error{
			Status:    res.StatusCode,
			Code:      wrap.Error.Code,
			Message:   msg,
			RequestID: wrap.Error.RequestID,
			DocURL:    wrap.Error.DocURL,
		}
	}

	out := &Response{}
	if err := json.Unmarshal(body, out); err != nil {
		return nil, fmt.Errorf("apihorseracing: the API returned something that was not JSON: %w", err)
	}

	return out, nil
}

// NextCursor returns the cursor for the following page, or "" at the end.
//
// The cursor is opaque: it is not an offset and arithmetic on it will not work.
func (r *Response) NextCursor() string {
	if r == nil || r.Meta == nil {
		return ""
	}
	if c, ok := r.Meta["next_cursor"].(string); ok {
		return c
	}
	return ""
}

// Countries — Jurisdictions. Every country in the archive with its race count and which fields it publishes.
func (c *Client) Countries(params map[string]string) (*Response, error) {
	return c.get("/v1/countries", params)
}

// Courses — Courses. Every course, with first and last meeting and how many races we hold.
func (c *Client) Courses(params map[string]string) (*Response, error) {
	return c.get("/v1/courses", params)
}

// MetaCoverage — Coverage. Totals, the full-order split, and what your own plan can read.
func (c *Client) MetaCoverage(params map[string]string) (*Response, error) {
	return c.get("/v1/meta/coverage", params)
}

// Search — Search everything. One lookup across horses, trainers, jockeys and courses.
func (c *Client) Search(params map[string]string) (*Response, error) {
	return c.get("/v1/search", params)
}

// CoursesCourse — Course profile. Run types, surfaces and distances actually raced there.
func (c *Client) CoursesCourse(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s", url.PathEscape(courseId)), params)
}

// Reference — Filter values. Valid goings, classes and run types, counted from the data.
func (c *Client) Reference(params map[string]string) (*Response, error) {
	return c.get("/v1/reference", params)
}

// MetaReports — Report coverage. How many race reports exist, from when, and for which jurisdictions.
func (c *Client) MetaReports(params map[string]string) (*Response, error) {
	return c.get("/v1/meta/reports", params)
}

// ReportsSearch — Find reports. Search written race reports by date, course or jurisdiction. Requires Complete or above.
func (c *Client) ReportsSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/reports", params)
}

// ReportsRace — Race report. The written account of a single race, with a line for every runner. Requires Complete or above.
func (c *Client) ReportsRace(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/reports/%s", url.PathEscape(raceId)), params)
}

// RacecardsToday — Today's cards. Every meeting and race today, grouped by course.
func (c *Client) RacecardsToday(params map[string]string) (*Response, error) {
	return c.get("/v1/racecards/today", params)
}

// RacecardsUpcoming — Upcoming. Declarations for the next few days.
func (c *Client) RacecardsUpcoming(params map[string]string) (*Response, error) {
	return c.get("/v1/racecards/upcoming", params)
}

// Meetings — Meetings by date. One row per course on that day, with going and race count.
func (c *Client) Meetings(date string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/meetings/%s", url.PathEscape(date)), params)
}

// ResultsLatest — Latest results. The most recently settled races your plan can read.
func (c *Client) ResultsLatest(params map[string]string) (*Response, error) {
	return c.get("/v1/results/latest", params)
}

// Racecards — Card by date. The full card for any date, grouped into meetings.
func (c *Client) Racecards(date string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/racecards/%s", url.PathEscape(date)), params)
}

// MeetingsMeeting — Meeting card. A meeting and every race on it.
func (c *Client) MeetingsMeeting(meetingId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/meetings/%s", url.PathEscape(meetingId)), params)
}

// Results — Results by date. Settled races for a date, grouped into meetings.
func (c *Client) Results(date string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/results/%s", url.PathEscape(date)), params)
}

// RacesSearch — Search races. Filter by date, region, run type, going, class, field size. Cursor paginated.
func (c *Client) RacesSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/races/search", params)
}

// RacesResult — Finishing order. Finishing order, casualties, dividends and prize money.
func (c *Client) RacesResult(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s/result", url.PathEscape(raceId)), params)
}

// RacesMarket — Market. Book percentage, every price, and what moved before the off.
func (c *Client) RacesMarket(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s/market", url.PathEscape(raceId)), params)
}

// RacesDividends — Dividends. Tote returns and prizes, where the jurisdiction published them.
func (c *Client) RacesDividends(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s/dividends", url.PathEscape(raceId)), params)
}

// Races — Race detail. Conditions, the market, and every runner with its price and position.
func (c *Client) Races(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s", url.PathEscape(raceId)), params)
}

// RacesRunners — Field and runners. The field alone, without the race conditions.
func (c *Client) RacesRunners(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s/runners", url.PathEscape(raceId)), params)
}

// RacesAnalysis — Race in context. Market shape, movers, and what this course and distance usually produces.
func (c *Client) RacesAnalysis(raceId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/races/%s/analysis", url.PathEscape(raceId)), params)
}

// HorsesForm — Form line. Recent runs, newest first, clipped to your window.
func (c *Client) HorsesForm(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s/form", url.PathEscape(horseId)), params)
}

// HorsesPedigree — Breeding. Sire, dam and damsire, plus others by the same sire.
func (c *Client) HorsesPedigree(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s/pedigree", url.PathEscape(horseId)), params)
}

// HorsesLayoff — After a break. Performance split by days since the last run.
func (c *Client) HorsesLayoff(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s/layoff", url.PathEscape(horseId)), params)
}

// HorsesCompare — Head to head. Every race these horses have both run in, and who finished ahead.
func (c *Client) HorsesCompare(params map[string]string) (*Response, error) {
	return c.get("/v1/horses/compare", params)
}

// HorsesSearch — Search horses. By name, with career totals attached.
func (c *Client) HorsesSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/horses/search", params)
}

// Horses — Horse profile. Career record and breeding where it has been fetched.
func (c *Client) Horses(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s", url.PathEscape(horseId)), params)
}

// HorsesTrend — Form trend. Each run measured against what the market expected of it.
func (c *Client) HorsesTrend(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s/trend", url.PathEscape(horseId)), params)
}

// HorsesStats — Statistics. The standard block, sliceable seventeen ways.
func (c *Client) HorsesStats(horseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/horses/%s/stats", url.PathEscape(horseId)), params)
}

// TrainersSearch — Search trainers. By name.
func (c *Client) TrainersSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/trainers/search", params)
}

// TrainersForm — Recent runners. Newest first, with the price and the finish.
func (c *Client) TrainersForm(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s/form", url.PathEscape(trainerId)), params)
}

// TrainersJockeys — By jockey. Which riders have paid for this yard.
func (c *Client) TrainersJockeys(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s/jockeys", url.PathEscape(trainerId)), params)
}

// TrainersCourses — By course. The slice that finds where a yard actually wins.
func (c *Client) TrainersCourses(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s/courses", url.PathEscape(trainerId)), params)
}

// Trainers — Trainer profile. Runs, wins and the horses sent out.
func (c *Client) Trainers(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s", url.PathEscape(trainerId)), params)
}

// TrainersStats — Statistics. Strike rate, A/E and level stakes, by any dimension.
func (c *Client) TrainersStats(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s/stats", url.PathEscape(trainerId)), params)
}

// TrainersOwners — By owner. Split by who owns the horse.
func (c *Client) TrainersOwners(trainerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/trainers/%s/owners", url.PathEscape(trainerId)), params)
}

// JockeysForm — Recent rides. Newest first.
func (c *Client) JockeysForm(jockeyId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/jockeys/%s/form", url.PathEscape(jockeyId)), params)
}

// JockeysTrainers — By trainer. Which yards a rider does well for.
func (c *Client) JockeysTrainers(jockeyId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/jockeys/%s/trainers", url.PathEscape(jockeyId)), params)
}

// OwnersJockeys — By jockey. Riders used, and how they paid.
func (c *Client) OwnersJockeys(ownerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/owners/%s/jockeys", url.PathEscape(ownerId)), params)
}

// OwnersCourses — By course. Where the colours have done well.
func (c *Client) OwnersCourses(ownerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/owners/%s/courses", url.PathEscape(ownerId)), params)
}

// JockeysSearch — Search jockeys. By name.
func (c *Client) JockeysSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/jockeys/search", params)
}

// Jockeys — Jockey profile. Rides, wins and the span of them.
func (c *Client) Jockeys(jockeyId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/jockeys/%s", url.PathEscape(jockeyId)), params)
}

// JockeysStats — Statistics. The standard block for a rider.
func (c *Client) JockeysStats(jockeyId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/jockeys/%s/stats", url.PathEscape(jockeyId)), params)
}

// OwnersSearch — Search owners. By name. Owners are identified by name; the source publishes no id.
func (c *Client) OwnersSearch(params map[string]string) (*Response, error) {
	return c.get("/v1/owners/search", params)
}

// Owners — Owner profile. Runs, wins and horses.
func (c *Client) Owners(ownerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/owners/%s", url.PathEscape(ownerId)), params)
}

// OwnersStats — Statistics. The standard block for an owner.
func (c *Client) OwnersStats(ownerId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/owners/%s/stats", url.PathEscape(ownerId)), params)
}

// WebhooksSubscribe — Subscribe. Point a URL at an event and we sign every delivery.
func (c *Client) WebhooksSubscribe(params map[string]string) (*Response, error) {
	return c.get("/v1/webhooks/subscribe", params)
}

// WebhooksDeliveries — Deliveries. What we sent, when, and whether it landed.
func (c *Client) WebhooksDeliveries(params map[string]string) (*Response, error) {
	return c.get("/v1/webhooks/deliveries", params)
}

// AccountUsage — Your usage. Requests, errors and every refusal, by endpoint.
func (c *Client) AccountUsage(params map[string]string) (*Response, error) {
	return c.get("/v1/account/usage", params)
}

// CoursesDrawBias — Draw bias. Low, middle and high thirds of the field, per distance. Requires the Complete + Analyst plan.
func (c *Client) CoursesDrawBias(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/draw-bias", url.PathEscape(courseId)), params)
}

// CoursesStandardTimes — Standard times. Median winning time per distance, with the implausible ones counted. Requires the Complete + Analyst plan.
func (c *Client) CoursesStandardTimes(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/standard-times", url.PathEscape(courseId)), params)
}

// CoursesFavourites — Favourites. How the market leader holds up here. Requires the Complete + Analyst plan.
func (c *Client) CoursesFavourites(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/favourites", url.PathEscape(courseId)), params)
}

// CoursesCasualties — Casualties. Non-completion rates by run type. Requires the Complete + Analyst plan.
func (c *Client) CoursesCasualties(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/casualties", url.PathEscape(courseId)), params)
}

// CoursesStats — Course statistics. The standard block for everything run there. Requires the Complete + Analyst plan.
func (c *Client) CoursesStats(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/stats", url.PathEscape(courseId)), params)
}

// CoursesGoingRecord — By going. How the ground changes what wins. Requires the Complete + Analyst plan.
func (c *Client) CoursesGoingRecord(courseId string, params map[string]string) (*Response, error) {
	return c.get(fmt.Sprintf("/v1/courses/%s/going-record", url.PathEscape(courseId)), params)
}

// MarketSpPerformance — Price performance. What each price band has actually returned. Requires the Complete + Analyst plan.
func (c *Client) MarketSpPerformance(params map[string]string) (*Response, error) {
	return c.get("/v1/market/sp-performance", params)
}

// MarketMovers — Market movers. Whether money moving tells you anything. Requires the Complete + Analyst plan.
func (c *Client) MarketMovers(params map[string]string) (*Response, error) {
	return c.get("/v1/market/movers", params)
}

// MarketOverround — Book percentage. How fat the books have been, by field size and course. Requires the Complete + Analyst plan.
func (c *Client) MarketOverround(params map[string]string) (*Response, error) {
	return c.get("/v1/market/overround", params)
}

// AnalysisAngles — Ask your own question. Every filter combined freely, returning the standard block. Requires the Complete + Analyst plan.
func (c *Client) AnalysisAngles(params map[string]string) (*Response, error) {
	return c.get("/v1/analysis/angles", params)
}

// AnalysisLayoff — Days since last run. Performance by days since the last run, across everything. Requires the Complete + Analyst plan.
func (c *Client) AnalysisLayoff(params map[string]string) (*Response, error) {
	return c.get("/v1/analysis/layoff", params)
}

// AnalysisPrecedents — Precedents. Races that ran under matching conditions. Requires the Complete + Analyst plan.
func (c *Client) AnalysisPrecedents(params map[string]string) (*Response, error) {
	return c.get("/v1/analysis/precedents", params)
}
