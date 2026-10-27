package cinema

import (
	"database/sql"
	"net/http"
	"strings"

	"backend/internal/pkg/httpx"
)

const movieColumns = `movie_id, title, COALESCE(genre,''), duration, COALESCE(language,''), COALESCE(subtitle,''),
	COALESCE(poster_image,''), COALESCE(trailer_link,''), COALESCE(director,''), COALESCE(synopsis,''),
	COALESCE(CAST(release_date AS TEXT),'')`

const cinemaColumns = `cinema_id, name, COALESCE(address,''), COALESCE(location_link,''), city,
	COALESCE(cinema_image,''), COALESCE(contact_no,'')`

// showtimeSelect is the SSC ShowtimeDTO join: showtime + movie + cinema + hall.
const showtimeSelect = `SELECT s.showtime_id, s.show_date, s.start_time, s.end_time,
	m.movie_id, m.title, COALESCE(m.genre,''), m.duration, COALESCE(m.language,''), COALESCE(m.subtitle,''),
	COALESCE(m.poster_image,''), COALESCE(m.trailer_link,''), COALESCE(m.director,''), COALESCE(m.synopsis,''),
	COALESCE(CAST(m.release_date AS TEXT),''),
	c.cinema_id, c.name, COALESCE(c.address,''), COALESCE(c.location_link,''), c.city,
	COALESCE(c.cinema_image,''), COALESCE(c.contact_no,''),
	h.hall_id, h.hall_name, h.experience_type
	FROM showtimes s
	JOIN movies m ON m.movie_id = s.movie_id
	JOIN cinemas c ON c.cinema_id = s.cinema_id
	JOIN halls h ON h.hall_id = s.hall_id`

func scanMovie(scanner interface{ Scan(...any) error }, m *Movie) error {
	return scanner.Scan(&m.MovieID, &m.Title, &m.Genre, &m.Duration, &m.Language, &m.Subtitle,
		&m.PosterImage, &m.TrailerLink, &m.Director, &m.Synopsis, &m.ReleaseDate)
}

func scanCinema(scanner interface{ Scan(...any) error }, c *Cinema) error {
	return scanner.Scan(&c.CinemaID, &c.Name, &c.Address, &c.LocationLink, &c.City, &c.CinemaImage, &c.ContactNo)
}

func scanShowtime(scanner interface{ Scan(...any) error }, s *Showtime) error {
	return scanner.Scan(&s.ShowtimeID, &s.ShowDate, &s.StartTime, &s.EndTime,
		&s.Movie.MovieID, &s.Movie.Title, &s.Movie.Genre, &s.Movie.Duration, &s.Movie.Language, &s.Movie.Subtitle,
		&s.Movie.PosterImage, &s.Movie.TrailerLink, &s.Movie.Director, &s.Movie.Synopsis, &s.Movie.ReleaseDate,
		&s.Cinema.CinemaID, &s.Cinema.Name, &s.Cinema.Address, &s.Cinema.LocationLink, &s.Cinema.City,
		&s.Cinema.CinemaImage, &s.Cinema.ContactNo,
		&s.Hall.HallID, &s.Hall.HallName, &s.Hall.ExperienceType)
}

func (c *Controller) queryMovies(query string, args ...any) ([]Movie, error) {
	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	movies := []Movie{}
	for rows.Next() {
		var m Movie
		if err := scanMovie(rows, &m); err != nil {
			return nil, err
		}
		movies = append(movies, m)
	}
	return movies, rows.Err()
}

func (c *Controller) queryShowtimes(query string, args ...any) ([]Showtime, error) {
	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Showtime{}
	for rows.Next() {
		var s Showtime
		if err := scanShowtime(rows, &s); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (c *Controller) queryReviews(targetTable string, targetID int) ([]Review, error) {
	rows, err := c.db.Query(`SELECT r.review_id, COALESCE(u.full_name,'Guest'), r.target_id, r.target_table,
		r.target_name, r.rating, COALESCE(r.review_text,''), strftime('%Y-%m-%d %H:%M:%S', r.review_date)
		FROM reviews r LEFT JOIN users u ON u.user_id = r.user_id
		WHERE r.target_table = ? AND r.target_id = ? ORDER BY r.review_date DESC`, targetTable, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Review{}
	for rows.Next() {
		var r Review
		if err := rows.Scan(&r.ReviewID, &r.UserFullName, &r.TargetID, &r.TargetTable, &r.TargetName,
			&r.Rating, &r.ReviewText, &r.ReviewDate); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func averageRating(reviews []Review) float64 {
	if len(reviews) == 0 {
		return 0
	}
	total := 0
	for _, r := range reviews {
		total += r.Rating
	}
	return float64(total) / float64(len(reviews))
}

// --- Movies ---

type movieIDRequest struct {
	MovieID int `json:"movieId"`
}

type movieDetailResponse struct {
	Movie         Movie    `json:"movie"`
	Rating        float64  `json:"rating"`
	Reviews       []Review `json:"reviews"`
}

func (c *Controller) MovieList(w http.ResponseWriter, _ *http.Request) {
	movies, err := c.queryMovies(`SELECT ` + movieColumns + ` FROM movies ORDER BY movie_id`)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, movies)
}

func (c *Controller) MovieDetail(w http.ResponseWriter, r *http.Request) {
	var req movieIDRequest
	if err := readJSON(r, &req); err != nil || req.MovieID <= 0 {
		httpx.WriteInvalidInput(w, "movieId is required")
		return
	}
	movies, err := c.queryMovies(`SELECT `+movieColumns+` FROM movies WHERE movie_id = ?`, req.MovieID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	if len(movies) == 0 {
		httpx.WriteNotFound(w, "movie not found")
		return
	}
	reviews, err := c.queryReviews("movies", req.MovieID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, movieDetailResponse{Movie: movies[0], Rating: averageRating(reviews), Reviews: reviews})
}

// --- Cinemas ---

type cinemaIDRequest struct {
	CinemaID int `json:"cinemaId"`
}

type cinemaDetailResponse struct {
	Cinema  Cinema   `json:"cinema"`
	Halls   []Hall   `json:"halls"`
	Rating  float64  `json:"rating"`
	Reviews []Review `json:"reviews"`
}

func (c *Controller) CinemaList(w http.ResponseWriter, _ *http.Request) {
	rows, err := c.db.Query(`SELECT ` + cinemaColumns + ` FROM cinemas ORDER BY city, cinema_id`)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	list := []Cinema{}
	for rows.Next() {
		var cin Cinema
		if err := scanCinema(rows, &cin); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		list = append(list, cin)
	}
	httpx.WriteOK(w, list)
}

func (c *Controller) CinemaDetail(w http.ResponseWriter, r *http.Request) {
	var req cinemaIDRequest
	if err := readJSON(r, &req); err != nil || req.CinemaID <= 0 {
		httpx.WriteInvalidInput(w, "cinemaId is required")
		return
	}
	var cin Cinema
	if err := scanCinema(c.db.QueryRow(`SELECT `+cinemaColumns+` FROM cinemas WHERE cinema_id = ?`, req.CinemaID), &cin); err != nil {
		if err == sql.ErrNoRows {
			httpx.WriteNotFound(w, "cinema not found")
			return
		}
		httpx.WriteInternalError(w, err.Error())
		return
	}
	halls, err := c.cinemaHalls(req.CinemaID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	reviews, err := c.queryReviews("cinemas", req.CinemaID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, cinemaDetailResponse{Cinema: cin, Halls: halls, Rating: averageRating(reviews), Reviews: reviews})
}

func (c *Controller) cinemaHalls(cinemaID int) ([]Hall, error) {
	rows, err := c.db.Query(`SELECT hall_id, hall_name, experience_type FROM halls WHERE cinema_id = ? ORDER BY hall_id`, cinemaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Hall{}
	for rows.Next() {
		var h Hall
		if err := rows.Scan(&h.HallID, &h.HallName, &h.ExperienceType); err != nil {
			return nil, err
		}
		list = append(list, h)
	}
	return list, rows.Err()
}

// --- Showtimes ---

type showtimeDatesRequest struct {
	MovieID int `json:"movieId"`
}

func (c *Controller) ShowtimeDates(w http.ResponseWriter, r *http.Request) {
	var req showtimeDatesRequest
	if err := readJSON(r, &req); err != nil || req.MovieID <= 0 {
		httpx.WriteInvalidInput(w, "movieId is required")
		return
	}
	rows, err := c.db.Query(`SELECT DISTINCT substr(show_date, 1, 10) FROM showtimes WHERE movie_id = ? ORDER BY 1`, req.MovieID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	dates := []string{}
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		dates = append(dates, d)
	}
	httpx.WriteOK(w, dates)
}

type showtimeExperiencesRequest struct {
	MovieID  int    `json:"movieId"`
	ShowDate string `json:"showDate"`
}

func (c *Controller) ShowtimeExperiences(w http.ResponseWriter, r *http.Request) {
	var req showtimeExperiencesRequest
	if err := readJSON(r, &req); err != nil || req.MovieID <= 0 || req.ShowDate == "" {
		httpx.WriteInvalidInput(w, "movieId and showDate are required")
		return
	}
	rows, err := c.db.Query(`SELECT DISTINCT h.experience_type FROM showtimes s
		JOIN halls h ON h.hall_id = s.hall_id
		WHERE s.movie_id = ? AND substr(s.show_date, 1, 10) = ? ORDER BY 1`, req.MovieID, req.ShowDate)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	list := []string{}
	for rows.Next() {
		var e string
		if err := rows.Scan(&e); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		list = append(list, e)
	}
	httpx.WriteOK(w, list)
}

type showtimeListRequest struct {
	MovieID        int    `json:"movieId"`
	ShowDate       string `json:"showDate"`
	ExperienceType string `json:"experienceType"`
}

func (c *Controller) ShowtimeList(w http.ResponseWriter, r *http.Request) {
	var req showtimeListRequest
	if err := readJSON(r, &req); err != nil || req.MovieID <= 0 || req.ShowDate == "" {
		httpx.WriteInvalidInput(w, "movieId and showDate are required")
		return
	}
	query := showtimeSelect + ` WHERE s.movie_id = ? AND substr(s.show_date, 1, 10) = ?`
	args := []any{req.MovieID, req.ShowDate}
	if strings.TrimSpace(req.ExperienceType) != "" {
		query += ` AND h.experience_type = ?`
		args = append(args, req.ExperienceType)
	}
	query += ` ORDER BY c.city, c.cinema_id, s.show_date, s.showtime_id`
	list, err := c.queryShowtimes(query, args...)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, list)
}

type showtimeIDRequest struct {
	ShowtimeID int `json:"showtimeId"`
}

func (c *Controller) ShowtimeDetail(w http.ResponseWriter, r *http.Request) {
	var req showtimeIDRequest
	if err := readJSON(r, &req); err != nil || req.ShowtimeID <= 0 {
		httpx.WriteInvalidInput(w, "showtimeId is required")
		return
	}
	list, err := c.queryShowtimes(showtimeSelect+` WHERE s.showtime_id = ?`, req.ShowtimeID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	if len(list) == 0 {
		httpx.WriteNotFound(w, "showtime not found")
		return
	}
	httpx.WriteOK(w, list[0])
}

// --- Seats & food ---

// SeatList returns the hall's seats for one showtime. BOOKED is derived from existing orders for that
// showtime, so each screening has its own seat map (SSC stored BOOKED on the seat itself).
func (c *Controller) SeatList(w http.ResponseWriter, r *http.Request) {
	var req showtimeIDRequest
	if err := readJSON(r, &req); err != nil || req.ShowtimeID <= 0 {
		httpx.WriteInvalidInput(w, "showtimeId is required")
		return
	}
	rows, err := c.db.Query(`SELECT se.seat_id, se.seat_number, se.seat_row, se.price,
		CASE WHEN se.status <> 'AVAILABLE' THEN se.status
		     WHEN EXISTS (SELECT 1 FROM orders o WHERE o.showtime_id = s.showtime_id AND o.seat_id = se.seat_id) THEN 'BOOKED'
		     ELSE 'AVAILABLE' END
		FROM showtimes s
		JOIN seats se ON se.hall_id = s.hall_id
		WHERE s.showtime_id = ?
		ORDER BY se.seat_row, se.seat_id`, req.ShowtimeID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	list := []Seat{}
	for rows.Next() {
		var s Seat
		if err := rows.Scan(&s.SeatID, &s.SeatNumber, &s.SeatRow, &s.Price, &s.Status); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		list = append(list, s)
	}
	httpx.WriteOK(w, list)
}

func (c *Controller) FoodList(w http.ResponseWriter, _ *http.Request) {
	rows, err := c.db.Query(`SELECT food_id, COALESCE(food_number,''), name, COALESCE(description,''),
		COALESCE(food_image,''), category, price FROM food ORDER BY category, food_id`)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	list := []Food{}
	for rows.Next() {
		var f Food
		if err := rows.Scan(&f.FoodID, &f.FoodNumber, &f.Name, &f.Description, &f.FoodImage, &f.Category, &f.Price); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		list = append(list, f)
	}
	httpx.WriteOK(w, list)
}
