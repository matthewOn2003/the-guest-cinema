package cinema

import (
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"time"

	"backend/internal/pkg/httpx"
)

type orderFoodItem struct {
	FoodID   int `json:"foodId"`
	Quantity int `json:"quantity"`
}

type createOrderRequest struct {
	ShowtimeID int             `json:"showtimeId"`
	SeatIDs    []int           `json:"seatIds"`
	Foods      []orderFoodItem `json:"foods"`
}

type createOrderResponse struct {
	OrderNumber int    `json:"orderNumber"`
	TotalAmount float64 `json:"totalAmount"`
	Ticket      Ticket `json:"ticket"`
}

// CreateOrder mirrors SSC's checkout: it writes one order row per seat and per food unit, creates the
// ticket, and marks the seats booked for that showtime. Prices are read from the database, never the client.
func (c *Controller) CreateOrder(w http.ResponseWriter, r *http.Request) {
	session := sessionFrom(r)
	var req createOrderRequest
	if err := readJSON(r, &req); err != nil || req.ShowtimeID <= 0 {
		httpx.WriteInvalidInput(w, "showtimeId is required")
		return
	}
	if len(req.SeatIDs) == 0 {
		httpx.WriteInvalidInput(w, "please select at least 1 seat")
		return
	}
	seen := map[int]bool{}
	for _, id := range req.SeatIDs {
		if seen[id] {
			httpx.WriteInvalidInput(w, "duplicate seat selected")
			return
		}
		seen[id] = true
	}
	for _, item := range req.Foods {
		if item.Quantity <= 0 || item.Quantity > 20 {
			httpx.WriteInvalidInput(w, "food quantity must be between 1 and 20")
			return
		}
	}

	tx, err := c.db.Begin()
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer tx.Rollback()

	status, err := c.checkoutInTx(tx, session.UserID, req)
	if err != nil {
		httpx.WriteConflict(w, err.Error())
		return
	}
	if status.err != nil {
		httpx.WriteInternalError(w, status.err.Error())
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	httpx.WriteCreated(w, status.response)
}

type checkoutResult struct {
	response createOrderResponse
	err      error
}

// checkoutInTx validates availability and prices, then writes the order rows and the ticket.
// Returned errors are business rejections (e.g. seat already taken); internal failures go in checkoutResult.err.
func (c *Controller) checkoutInTx(tx *sql.Tx, userID int, req createOrderRequest) (checkoutResult, error) {
	var hallID int
	var movieTitle, cinemaName, hallName, showDate string
	err := tx.QueryRow(`SELECT s.hall_id, m.title, c.name, h.hall_name, s.show_date
		FROM showtimes s
		JOIN movies m ON m.movie_id = s.movie_id
		JOIN cinemas c ON c.cinema_id = s.cinema_id
		JOIN halls h ON h.hall_id = s.hall_id
		WHERE s.showtime_id = ?`, req.ShowtimeID).Scan(&hallID, &movieTitle, &cinemaName, &hallName, &showDate)
	if err == sql.ErrNoRows {
		return checkoutResult{}, fmt.Errorf("showtime not found")
	}
	if err != nil {
		return checkoutResult{err: err}, nil
	}

	total := 0.0
	for _, seatID := range req.SeatIDs {
		var seatHall int
		var seatStatus, seatNumber string
		var price float64
		err := tx.QueryRow(`SELECT hall_id, status, seat_number, price FROM seats WHERE seat_id = ?`, seatID).
			Scan(&seatHall, &seatStatus, &seatNumber, &price)
		if err == sql.ErrNoRows || (err == nil && seatHall != hallID) {
			return checkoutResult{}, fmt.Errorf("seat %d does not belong to this showtime", seatID)
		}
		if err != nil {
			return checkoutResult{err: err}, nil
		}
		if seatStatus != "AVAILABLE" {
			return checkoutResult{}, fmt.Errorf("seat %s is not available", seatNumber)
		}
		var taken int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM orders WHERE showtime_id = ? AND seat_id = ?`, req.ShowtimeID, seatID).Scan(&taken); err != nil {
			return checkoutResult{err: err}, nil
		}
		if taken > 0 {
			return checkoutResult{}, fmt.Errorf("seat %s has just been booked, please choose another seat", seatNumber)
		}
		total += price
	}

	type foodPriced struct {
		foodID   int
		name     string
		unit     float64
		quantity int
	}
	foods := []foodPriced{}
	for _, item := range req.Foods {
		var name string
		var unit float64
		err := tx.QueryRow(`SELECT name, price FROM food WHERE food_id = ?`, item.FoodID).Scan(&name, &unit)
		if err == sql.ErrNoRows {
			return checkoutResult{}, fmt.Errorf("food %d not found", item.FoodID)
		}
		if err != nil {
			return checkoutResult{err: err}, nil
		}
		foods = append(foods, foodPriced{item.FoodID, name, unit, item.Quantity})
		total += unit * float64(item.Quantity)
	}
	total = math.Round(total*100) / 100

	var orderNumber int
	if err := tx.QueryRow(`SELECT COALESCE(MAX(order_number), 1000) + 1 FROM orders`).Scan(&orderNumber); err != nil {
		return checkoutResult{err: err}, nil
	}

	for _, seatID := range req.SeatIDs {
		if _, err := tx.Exec(`INSERT INTO orders (order_number, user_id, showtime_id, transaction_date, total_amount, food_id, seat_id)
			VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, NULL, ?)`, orderNumber, userID, req.ShowtimeID, total, seatID); err != nil {
			return checkoutResult{err: err}, nil
		}
	}
	for _, f := range foods {
		for i := 0; i < f.quantity; i++ {
			if _, err := tx.Exec(`INSERT INTO orders (order_number, user_id, showtime_id, transaction_date, total_amount, food_id, seat_id)
				VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, NULL)`, orderNumber, userID, req.ShowtimeID, total, f.foodID); err != nil {
				return checkoutResult{err: err}, nil
			}
		}
	}
	if _, err := tx.Exec(`INSERT INTO tickets (reference_no, hall_name, movie_title, cinema_name, created_at, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, orderNumber, hallName, movieTitle, cinemaName); err != nil {
		return checkoutResult{err: err}, nil
	}

	ticket := Ticket{
		ReferenceNo: orderNumber,
		MovieTitle:  movieTitle,
		CinemaName:  cinemaName,
		HallName:    hallName,
		ShowDate:    showDate,
		TotalAmount: total,
		PurchasedAt: time.Now().Format("2006-01-02 15:04:05"),
		Seats:       []string{},
		Foods:       []FoodLine{},
	}
	return checkoutResult{response: createOrderResponse{OrderNumber: orderNumber, TotalAmount: total, Ticket: ticket}}, nil
}

// TicketList returns the signed-in guest's tickets, newest first, each with its seats and food lines.
func (c *Controller) TicketList(w http.ResponseWriter, r *http.Request) {
	session := sessionFrom(r)
	rows, err := c.db.Query(`SELECT o.order_number, o.total_amount, s.show_date,
			m.title, c.name, h.hall_name,
			COALESCE(strftime('%Y-%m-%d %H:%M:%S', t.created_at), ''),
			COALESCE(se.seat_number, ''),
			COALESCE(f.food_id, 0), COALESCE(f.name, ''), COALESCE(f.price, 0)
		FROM orders o
		JOIN showtimes s ON s.showtime_id = o.showtime_id
		JOIN movies m ON m.movie_id = s.movie_id
		JOIN cinemas c ON c.cinema_id = s.cinema_id
		JOIN halls h ON h.hall_id = s.hall_id
		LEFT JOIN tickets t ON t.reference_no = o.order_number
		LEFT JOIN seats se ON se.seat_id = o.seat_id
		LEFT JOIN food f ON f.food_id = o.food_id
		WHERE o.user_id = ?
		ORDER BY o.order_number DESC, o.order_id ASC`, session.UserID)
	if err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	defer rows.Close()

	tickets := []*Ticket{}
	byRef := map[int]*Ticket{}
	foodIndex := map[int]map[int]int{} // reference -> foodID -> index into Foods
	for rows.Next() {
		var ref, foodID int
		var total float64
		var showDate, movie, cinema, hall, purchased, seat, foodName string
		var foodPrice float64
		if err := rows.Scan(&ref, &total, &showDate, &movie, &cinema, &hall, &purchased, &seat, &foodID, &foodName, &foodPrice); err != nil {
			httpx.WriteInternalError(w, err.Error())
			return
		}
		t, ok := byRef[ref]
		if !ok {
			t = &Ticket{ReferenceNo: ref, MovieTitle: movie, CinemaName: cinema, HallName: hall,
				ShowDate: showDate, TotalAmount: total, PurchasedAt: purchased, Seats: []string{}, Foods: []FoodLine{}}
			byRef[ref] = t
			foodIndex[ref] = map[int]int{}
			tickets = append(tickets, t)
		}
		if seat != "" {
			t.Seats = append(t.Seats, seat)
		}
		if foodID != 0 {
			idx, seen := foodIndex[ref][foodID]
			if !seen {
				idx = len(t.Foods)
				foodIndex[ref][foodID] = idx
				t.Foods = append(t.Foods, FoodLine{Name: foodName, UnitPrice: foodPrice})
			}
			t.Foods[idx].Quantity++
			t.Foods[idx].Subtotal = math.Round(t.Foods[idx].UnitPrice*float64(t.Foods[idx].Quantity)*100) / 100
		}
	}
	if err := rows.Err(); err != nil {
		httpx.WriteInternalError(w, err.Error())
		return
	}
	result := make([]Ticket, 0, len(tickets))
	for _, t := range tickets {
		result = append(result, *t)
	}
	httpx.WriteOK(w, result)
}
