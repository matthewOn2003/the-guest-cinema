package cinema

import (
	"net/http"

	"backend/internal/pkg/middleware"
)

// NewRouter exposes the guest portal API under /api/v1/cinema/. Public routes are auth and browsing;
// everything that touches a guest's own data requires a guest session.
func NewRouter(c *Controller, allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()
	guest := c.requireGuest

	// Account
	mux.HandleFunc("POST /api/v1/cinema/auth/otp/request", c.OTPRequest)
	mux.HandleFunc("POST /api/v1/cinema/auth/register", c.Register)
	mux.HandleFunc("POST /api/v1/cinema/auth/login", c.Login)
	mux.HandleFunc("POST /api/v1/cinema/auth/session", guest(c.Session))
	mux.HandleFunc("POST /api/v1/cinema/auth/logout", c.Logout)
	mux.HandleFunc("POST /api/v1/cinema/user/update", guest(c.UpdateProfile))

	// Catalog (browsing is open, as on the SSC site)
	mux.HandleFunc("POST /api/v1/cinema/movie/list", c.MovieList)
	mux.HandleFunc("POST /api/v1/cinema/movie/detail", c.MovieDetail)
	mux.HandleFunc("POST /api/v1/cinema/cinema/list", c.CinemaList)
	mux.HandleFunc("POST /api/v1/cinema/cinema/detail", c.CinemaDetail)
	mux.HandleFunc("POST /api/v1/cinema/showtime/dates", c.ShowtimeDates)
	mux.HandleFunc("POST /api/v1/cinema/showtime/experiences", c.ShowtimeExperiences)
	mux.HandleFunc("POST /api/v1/cinema/showtime/list", c.ShowtimeList)
	mux.HandleFunc("POST /api/v1/cinema/showtime/detail", c.ShowtimeDetail)
	mux.HandleFunc("POST /api/v1/cinema/seat/list", c.SeatList)
	mux.HandleFunc("POST /api/v1/cinema/food/list", c.FoodList)

	// Guest data
	mux.HandleFunc("POST /api/v1/cinema/order/create", guest(c.CreateOrder))
	mux.HandleFunc("POST /api/v1/cinema/ticket/list", guest(c.TicketList))
	mux.HandleFunc("POST /api/v1/cinema/review/list", guest(c.ReviewsByUser))

	return middleware.WithCORS(mux, allowedOrigins)
}
