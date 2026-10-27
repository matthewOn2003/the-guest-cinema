package cinema

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"backend/internal/pkg/httpx"
	"backend/internal/pkg/middleware"
	userdelivery "backend/internal/user/delivery"
)

// roleGuest is the token role for guest-portal accounts.
const roleGuest = "guest"

type Controller struct {
	db           *sql.DB
	secret       string
	cookieSecure bool
	devMode      bool // when true, the OTP is echoed back in the response (mock email delivery)
	otps         *otpStore
}

func NewController(db *sql.DB, secret string, cookieSecure, devMode bool) *Controller {
	return &Controller{
		db:           db,
		secret:       secret,
		cookieSecure: cookieSecure,
		devMode:      devMode,
		otps:         newOTPStore(5 * time.Minute),
	}
}

func readJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

type sessionKey struct{}

// guestSession is the authenticated guest attached to a request by requireGuest.
type guestSession struct {
	UserID   int
	Username string
}

func sessionFrom(r *http.Request) guestSession {
	s, _ := r.Context().Value(sessionKey{}).(guestSession)
	return s
}

// requireGuest authenticates the session cookie and resolves the guest's user_id.
func (c *Controller) requireGuest(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(middleware.AuthCookieName)
		if err != nil {
			httpx.WriteUnauthorized(w, "authentication required")
			return
		}
		username, role, ok := userdelivery.VerifyToken(cookie.Value, c.secret)
		if !ok || role != roleGuest {
			httpx.WriteUnauthorized(w, "authentication required")
			return
		}
		var userID int
		if err := c.db.QueryRow(`SELECT user_id FROM users WHERE username = ?`, username).Scan(&userID); err != nil {
			httpx.WriteUnauthorized(w, "authentication required")
			return
		}
		ctx := context.WithValue(r.Context(), sessionKey{}, guestSession{UserID: userID, Username: username})
		next(w, r.WithContext(ctx))
	}
}

func (c *Controller) setSessionCookie(w http.ResponseWriter, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.AuthCookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   c.cookieSecure,
		MaxAge:   maxAge,
	})
}

// otpStore keeps one-time codes for registration in memory, each valid for a limited time.
type otpStore struct {
	mu      sync.Mutex
	ttl     time.Duration
	entries map[string]otpEntry
}

type otpEntry struct {
	code    string
	expires time.Time
}

func newOTPStore(ttl time.Duration) *otpStore {
	return &otpStore{ttl: ttl, entries: map[string]otpEntry{}}
}

func (s *otpStore) put(email, code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[email] = otpEntry{code: code, expires: time.Now().Add(s.ttl)}
}

// consume returns true only when the code matches and has not expired; a used code is removed.
func (s *otpStore) consume(email, code string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.entries[email]
	if !ok || time.Now().After(entry.expires) || entry.code != code {
		return false
	}
	delete(s.entries, email)
	return true
}
