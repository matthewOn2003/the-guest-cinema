package cinema

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"backend/internal/pkg/httpx"
	userdelivery "backend/internal/user/delivery"
	"golang.org/x/crypto/bcrypt"
)

// Validation rules are the same as the SSC registration and profile forms.
var (
	usernamePattern = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9._]{5,10}$`)
	emailPattern    = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$`)
	fullNamePattern = regexp.MustCompile(`^[a-zA-Z\s]{6,20}$`)
	phonePattern    = regexp.MustCompile(`^01\d{8}$`)
)

func validPassword(p string) bool {
	if len(p) < 5 || len(p) > 20 {
		return false
	}
	var hasSymbol, hasLower, hasUpper, hasDigit bool
	for _, ch := range p {
		switch {
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case strings.ContainsRune("!@#$%^&*", ch):
			hasSymbol = true
		default:
			return false
		}
	}
	return hasSymbol && hasLower && hasUpper && hasDigit
}

func newOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

type otpRequest struct {
	Email string `json:"email"`
}

// OTPRequest issues a registration code. Email delivery is mocked: the code is logged, and returned
// in the response only in development mode.
func (c *Controller) OTPRequest(w http.ResponseWriter, r *http.Request) {
	var req otpRequest
	if err := readJSON(r, &req); err != nil || !emailPattern.MatchString(req.Email) {
		httpx.WriteInvalidInput(w, "Please check your email format.")
		return
	}
	var exists int
	if err := c.db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, req.Email).Scan(&exists); err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	if exists > 0 {
		httpx.WriteConflict(w, "Email already used, please log in or try another email.")
		return
	}
	code, err := newOTP()
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	c.otps.put(req.Email, code)
	log.Printf("[cinema] registration OTP for %s: %s", req.Email, code)
	resp := map[string]any{"sent": true}
	if c.devMode {
		resp["devOtp"] = code
	}
	httpx.WriteOK(w, resp)
}

type registerRequest struct {
	Username       string `json:"username"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	FullName       string `json:"fullName"`
	PhoneNumber    string `json:"phoneNumber"`
	BirthDate      string `json:"birthDate"` // YYYY-MM-DD
	OTP            string `json:"otp"`
	TermsAccepted  bool   `json:"termsAccepted"`
}

func (c *Controller) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := readJSON(r, &req); err != nil {
		httpx.WriteInvalidInput(w, "invalid request")
		return
	}
	switch {
	case !usernamePattern.MatchString(req.Username):
		httpx.WriteInvalidInput(w, "Please check your username format: Should start with a letter, only letters, numbers, . or _, and length between 6 and 11.")
		return
	case !validPassword(req.Password):
		httpx.WriteInvalidInput(w, "Please check your password format: Should be 5-20 characters long and contain at least 1 symbol, 1 uppercase letter, 1 lowercase letter, and 1 number.")
		return
	case !fullNamePattern.MatchString(req.FullName):
		httpx.WriteInvalidInput(w, "Please check your full name format: Should be 6-20 characters long and only contain letters.")
		return
	case !phonePattern.MatchString(req.PhoneNumber):
		httpx.WriteInvalidInput(w, "Please check your phone number format: Should be 10 digits and start with 01.")
		return
	case !emailPattern.MatchString(req.Email):
		httpx.WriteInvalidInput(w, "Please check your email format.")
		return
	case !req.TermsAccepted:
		httpx.WriteInvalidInput(w, "Please tick the terms accepted check box.")
		return
	}
	if _, err := time.Parse("2006-01-02", req.BirthDate); err != nil {
		httpx.WriteInvalidInput(w, "Please choose a valid birth date.")
		return
	}
	if !c.otps.consume(req.Email, req.OTP) {
		httpx.WriteInvalidInput(w, "Invalid or expired OTP.")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	res, err := c.db.Exec(`INSERT INTO users (username, email, password, full_name, role, status, phone_number, birth_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		req.Username, req.Email, string(hash), req.FullName, req.PhoneNumber, req.BirthDate)
	if err != nil {
		httpx.WriteConflict(w, "Username or email already used.")
		return
	}
	id, _ := res.LastInsertId()
	user, err := c.userByID(int(id))
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteCreated(w, user)
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (c *Controller) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := readJSON(r, &req); err != nil || req.Username == "" || req.Password == "" {
		httpx.WriteInvalidInput(w, "username and password are required")
		return
	}
	var id int
	var hash string
	err := c.db.QueryRow(`SELECT user_id, password FROM users WHERE username = ?`, req.Username).Scan(&id, &hash)
	if err == sql.ErrNoRows || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil) {
		httpx.WriteUnauthorized(w, "User do not exist. Please register an account first.")
		return
	}
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	_, _ = c.db.Exec(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?`, id)
	c.setSessionCookie(w, userdelivery.CreateToken(req.Username, roleGuest, c.secret), 60*60*8)
	user, err := c.userByID(id)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, user)
}

func (c *Controller) Session(w http.ResponseWriter, r *http.Request) {
	user, err := c.userByID(sessionFrom(r).UserID)
	if err != nil {
		httpx.WriteUnauthorized(w, "authentication required")
		return
	}
	httpx.WriteOK(w, user)
}

func (c *Controller) Logout(w http.ResponseWriter, _ *http.Request) {
	c.setSessionCookie(w, "", -1)
	httpx.WriteOK(w, nil)
}

type updateProfileRequest struct {
	FullName    string `json:"fullName"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
}

func (c *Controller) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	session := sessionFrom(r)
	var req updateProfileRequest
	if err := readJSON(r, &req); err != nil {
		httpx.WriteInvalidInput(w, "invalid request")
		return
	}
	switch {
	case !emailPattern.MatchString(req.Email):
		httpx.WriteInvalidInput(w, "Please check your email format.")
		return
	case !fullNamePattern.MatchString(req.FullName):
		httpx.WriteInvalidInput(w, "Please check your full name format: Should be 6-20 characters long and only contain letters.")
		return
	case !phonePattern.MatchString(req.PhoneNumber):
		httpx.WriteInvalidInput(w, "Please check your phone number format: Should be 10 digits and start with 01.")
		return
	}
	var taken int
	if err := c.db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ? AND user_id <> ?`, req.Email, session.UserID).Scan(&taken); err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	if taken > 0 {
		httpx.WriteConflict(w, "Email already used, please log in or try another email.")
		return
	}
	if _, err := c.db.Exec(`UPDATE users SET full_name = ?, email = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
		req.FullName, req.Email, req.PhoneNumber, session.UserID); err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	user, err := c.userByID(session.UserID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteOK(w, user)
}

func (c *Controller) userByID(id int) (User, error) {
	var u User
	err := c.db.QueryRow(`SELECT user_id, username, email, full_name, COALESCE(phone_number,''),
		COALESCE(CAST(birth_date AS TEXT),''), role, status FROM users WHERE user_id = ?`, id).
		Scan(&u.UserID, &u.Username, &u.Email, &u.FullName, &u.PhoneNumber, &u.BirthDate, &u.Role, &u.Status)
	return u, err
}

// ReviewsByUser lists the reviews a guest has posted, newest first.
func (c *Controller) ReviewsByUser(w http.ResponseWriter, r *http.Request) {
	session := sessionFrom(r)
	rows, err := c.db.Query(`SELECT r.review_id, COALESCE(u.full_name,'Guest'), r.target_id, r.target_table,
		r.target_name, r.rating, COALESCE(r.review_text,''), strftime('%Y-%m-%d %H:%M:%S', r.review_date)
		FROM reviews r LEFT JOIN users u ON u.user_id = r.user_id
		WHERE r.user_id = ? ORDER BY r.review_date DESC`, session.UserID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()
	list := []Review{}
	for rows.Next() {
		var rv Review
		if err := rows.Scan(&rv.ReviewID, &rv.UserFullName, &rv.TargetID, &rv.TargetTable, &rv.TargetName,
			&rv.Rating, &rv.ReviewText, &rv.ReviewDate); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		list = append(list, rv)
	}
	httpx.WriteOK(w, list)
}
