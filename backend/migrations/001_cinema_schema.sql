-- Cinema guest portal schema (ported from the SSC cinema project, SQLite dialect).
-- Table and column names follow the original MyBatis mappers so the data model stays one-to-one.

CREATE TABLE IF NOT EXISTS users (
    user_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT NOT NULL UNIQUE,
    email            TEXT NOT NULL UNIQUE,
    password         TEXT NOT NULL,            -- bcrypt hash
    full_name        TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'USER',
    status           TEXT NOT NULL DEFAULT 'ACTIVE',
    profile_picture  TEXT,
    phone_number     TEXT,
    birth_date       TEXT,
    last_login       DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cinemas (
    cinema_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    address       TEXT,
    location_link TEXT,
    city          TEXT NOT NULL,
    cinema_image  TEXT,
    contact_no    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS halls (
    hall_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cinema_id       INTEGER NOT NULL REFERENCES cinemas(cinema_id),
    hall_name       TEXT NOT NULL,
    experience_type TEXT NOT NULL,            -- 2D / 3D / IMAX / 4D / VIP
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
    movie_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    genre         TEXT,
    duration      INTEGER NOT NULL,           -- minutes
    language      TEXT,
    subtitle      TEXT,
    poster_image  TEXT,
    trailer_link  TEXT,
    director      TEXT,
    synopsis      TEXT,
    release_date  DATE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS showtimes (
    showtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id    INTEGER NOT NULL REFERENCES movies(movie_id),
    cinema_id   INTEGER NOT NULL REFERENCES cinemas(cinema_id),
    hall_id     INTEGER NOT NULL REFERENCES halls(hall_id),
    show_date   TEXT NOT NULL,                -- 'YYYY-MM-DD HH:MM:SS' (screening start)
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
    seat_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id     INTEGER NOT NULL REFERENCES halls(hall_id),
    seat_number TEXT NOT NULL,                -- e.g. C08
    seat_row    TEXT NOT NULL,                -- e.g. C
    status      TEXT NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE / BLOCKED (BOOKED is derived per showtime from orders)
    price       REAL NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food (
    food_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    food_number TEXT,
    name        TEXT NOT NULL,
    description TEXT,
    food_image  TEXT,
    category    TEXT NOT NULL,
    price       REAL NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One row per purchased unit: one row per seat, one row per food item (quantity = number of rows).
CREATE TABLE IF NOT EXISTS orders (
    order_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number     INTEGER NOT NULL,
    user_id          INTEGER NOT NULL REFERENCES users(user_id),
    showtime_id      INTEGER NOT NULL REFERENCES showtimes(showtime_id),
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount     REAL NOT NULL,
    food_id          INTEGER REFERENCES food(food_id),
    seat_id          INTEGER REFERENCES seats(seat_id),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_showtime_seat ON orders(showtime_id, seat_id);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_no INTEGER NOT NULL UNIQUE,     -- equals orders.order_number
    hall_name    TEXT NOT NULL,
    movie_title  TEXT NOT NULL,
    cinema_name  TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(user_id),
    target_id    INTEGER NOT NULL,
    target_table TEXT NOT NULL,               -- 'movies' or 'cinemas'
    target_name  TEXT NOT NULL,
    rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text  TEXT,
    review_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_table, target_id);
