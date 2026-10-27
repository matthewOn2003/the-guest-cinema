-- Mock data for the guest portal (mirrors the SSC demo data shape).
-- Demo guest account is created by the application at start-up (see internal/cinema/seed.go).

INSERT INTO cinemas (cinema_id, name, address, location_link, city, cinema_image, contact_no) VALUES
 (1, 'The Guest Bangsar',   'Level 3, Mid Valley Lane, Bangsar', 'https://maps.google.com/?q=Bangsar', 'Kuala Lumpur', 'https://placehold.co/800x450?text=Bangsar', '03-2000 1001'),
 (2, 'The Guest Sunway',    'Lot 12, Sunway Pyramid, Petaling Jaya', 'https://maps.google.com/?q=Sunway+Pyramid', 'Selangor', 'https://placehold.co/800x450?text=Sunway', '03-5621 2002'),
 (3, 'The Guest Gurney',    'Level 2, Gurney Plaza, Penang', 'https://maps.google.com/?q=Gurney+Plaza', 'Penang', 'https://placehold.co/800x450?text=Gurney', '04-226 3003'),
 (4, 'The Guest Johor',     'Level 1, Johor Premium Outlets, Johor Bahru', 'https://maps.google.com/?q=Johor+Premium+Outlets', 'Johor', 'https://placehold.co/800x450?text=Johor', '07-353 4004');

INSERT INTO halls (hall_id, cinema_id, hall_name, experience_type, status) VALUES
 (1, 1, 'Hall 1', '2D', 'ACTIVE'),
 (2, 1, 'Hall 2', 'IMAX', 'ACTIVE'),
 (3, 2, 'Hall 1', '2D', 'ACTIVE'),
 (4, 2, 'Hall 2', '4D', 'ACTIVE'),
 (5, 3, 'Hall 1', '3D', 'ACTIVE'),
 (6, 3, 'Hall 2', 'VIP', 'ACTIVE'),
 (7, 4, 'Hall 1', '2D', 'ACTIVE'),
 (8, 4, 'Hall 2', 'IMAX', 'ACTIVE');

INSERT INTO movies (movie_id, title, genre, duration, language, subtitle, poster_image, trailer_link, director, synopsis, release_date) VALUES
 (1, 'Starlight Over Kuala', 'Drama', 118, 'Malay', 'English, Chinese', 'https://placehold.co/400x600?text=Starlight', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Amir Hakim', 'A stargazer returns to her hometown and rediscovers the night sky she left behind.', '2026-10-22'),
 (2, 'The Last Courtesy', 'Thriller', 104, 'English', 'Chinese, Malay', 'https://placehold.co/400x600?text=Courtesy', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Lin Wei', 'A hotel concierge uncovers a guest who never checked out.', '2026-10-15'),
 (3, 'Lantern Road', 'Animation', 96, 'Mandarin', 'English, Malay', 'https://placehold.co/400x600?text=Lantern', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Chen Yu', 'Three lanterns guide a lost girl home through a city that changes every night.', '2026-10-29'),
 (4, 'Midnight Overture', 'Musical', 127, 'English', 'Malay', 'https://placehold.co/400x600?text=Overture', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Sarah Lim', 'A conductor has one night to finish the symphony her late mentor left unfinished.', '2026-10-08'),
 (5, 'Velvet Harbour', 'Romance', 109, 'English', 'Chinese', 'https://placehold.co/400x600?text=Harbour', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Daniel Ong', 'Two strangers stranded at a seaside hotel share the same unanswered letter.', '2026-10-01'),
 (6, 'The Gilded Key', 'Mystery', 122, 'English', 'Malay, Chinese', 'https://placehold.co/400x600?text=GildedKey', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Rachel Tan', 'A locksmith is hired to open a vault in a palace that officially does not exist.', '2026-10-20');

INSERT INTO food (food_id, food_number, name, description, food_image, category, price) VALUES
 (1, 'F001', 'Caramel Popcorn (L)', 'Sweet caramel popcorn, large', 'https://placehold.co/300x300?text=Caramel', 'Popcorn', 16.90),
 (2, 'F002', 'Salted Popcorn (L)', 'Classic salted popcorn, large', 'https://placehold.co/300x300?text=Salted', 'Popcorn', 15.90),
 (3, 'F003', 'Cola (L)', 'Iced cola, large', 'https://placehold.co/300x300?text=Cola', 'Drinks', 8.50),
 (4, 'F004', 'Lemon Tea (M)', 'Iced lemon tea, medium', 'https://placehold.co/300x300?text=LemonTea', 'Drinks', 7.50),
 (5, 'F005', 'Mineral Water', '500ml bottled water', 'https://placehold.co/300x300?text=Water', 'Drinks', 3.00),
 (6, 'F006', 'Nacho Platter', 'Cheese dip with tortilla chips', 'https://placehold.co/300x300?text=Nachos', 'Snacks', 12.90),
 (7, 'F007', 'Hot Dog', 'Grilled sausage in a soft bun', 'https://placehold.co/300x300?text=HotDog', 'Snacks', 9.90),
 (8, 'F008', 'Chocolate Bar', 'Dark chocolate bar', 'https://placehold.co/300x300?text=Chocolate', 'Snacks', 5.50);

-- Seats: 8 seats per row, 4 rows (A-D) per hall. Rows A-B are Premium (RM 35), rows C-D are Standard (RM 25).
WITH RECURSIVE r(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM r WHERE i < 3),
                n(j) AS (SELECT 1 UNION ALL SELECT j + 1 FROM n WHERE j < 8)
INSERT INTO seats (hall_id, seat_number, seat_row, status, price)
SELECT h.hall_id,
       substr('ABCD', r.i + 1, 1) || printf('%02d', n.j),
       substr('ABCD', r.i + 1, 1),
       'AVAILABLE',
       CASE WHEN r.i < 2 THEN 35.00 ELSE 25.00 END
FROM halls h CROSS JOIN r CROSS JOIN n;

-- Showtimes: 7 days from 2026-10-27, 4 screenings per hall per day. Each hall rotates through the 6 movies.
WITH RECURSIVE d(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM d WHERE i < 6),
 t(tm) AS (VALUES ('12:30:00'), ('15:45:00'), ('19:30:00'), ('22:00:00'))
INSERT INTO showtimes (movie_id, cinema_id, hall_id, show_date, start_time, end_time)
SELECT x.movie_id, x.cinema_id, x.hall_id, x.sd, x.sd, datetime(x.sd, '+' || x.duration || ' minutes')
FROM (
    SELECT mv.movie_id, mv.duration, h.cinema_id, h.hall_id,
           date('2026-10-27', '+' || d.i || ' day') || ' ' || t.tm AS sd
    FROM halls h
    CROSS JOIN d
    CROSS JOIN t
    JOIN movies mv ON mv.movie_id = ((h.hall_id + d.i) % 6) + 1
) x;

-- Sample reviews. user_id 1 is the demo guest account created at start-up.
INSERT INTO reviews (user_id, target_id, target_table, target_name, rating, review_text, review_date) VALUES
 (1, 1, 'movies', 'Starlight Over Kuala', 5, 'Beautiful cinematography, the ending is perfect.', '2026-10-24 20:10:00'),
 (1, 2, 'movies', 'The Last Courtesy', 4, 'Tense from start to finish. Service at the venue was lovely.', '2026-10-18 21:00:00'),
 (1, 1, 'cinemas', 'The Guest Bangsar', 5, 'Staff greeted us at the door and walked us to our seats.', '2026-10-21 19:05:00');
