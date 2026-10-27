package cinema

import (
	"database/sql"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// SeedDemoGuest creates one demo guest account when the users table is empty.
// The mock reviews in migrations/002 point at user_id 1, which this account gets on a fresh database.
func SeedDemoGuest(db *sql.DB) error {
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("Demo@2026"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash demo password: %w", err)
	}
	_, err = db.Exec(`INSERT INTO users (username, email, password, full_name, role, status, phone_number, birth_date, created_at, updated_at)
		VALUES ('guestdemo', 'guest@example.com', ?, 'Demo Guest', 'USER', 'ACTIVE', '0123456789', '1995-05-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, string(hash))
	return err
}
