package cinema

// JSON shapes follow the SSC cinema project's models, camelCased for the guest portal.

type Movie struct {
	MovieID     int    `json:"movieId"`
	Title       string `json:"title"`
	Genre       string `json:"genre"`
	Duration    int    `json:"duration"`
	Language    string `json:"language"`
	Subtitle    string `json:"subtitle"`
	PosterImage string `json:"posterImage"`
	TrailerLink string `json:"trailerLink"`
	Director    string `json:"director"`
	Synopsis    string `json:"synopsis"`
	ReleaseDate string `json:"releaseDate"`
}

type Cinema struct {
	CinemaID     int    `json:"cinemaId"`
	Name         string `json:"name"`
	Address      string `json:"address"`
	LocationLink string `json:"locationLink"`
	City         string `json:"city"`
	CinemaImage  string `json:"cinemaImage"`
	ContactNo    string `json:"contactNo"`
}

type Hall struct {
	HallID         int    `json:"hallId"`
	HallName       string `json:"hallName"`
	ExperienceType string `json:"experienceType"`
}

// Showtime mirrors the SSC ShowtimeDTO: the showtime with its movie, cinema and hall nested.
type Showtime struct {
	ShowtimeID int    `json:"showtimeId"`
	ShowDate   string `json:"showDate"`  // "YYYY-MM-DD HH:MM:SS"
	StartTime  string `json:"startTime"` // "YYYY-MM-DD HH:MM:SS"
	EndTime    string `json:"endTime"`
	Movie      Movie  `json:"movie"`
	Cinema     Cinema `json:"cinema"`
	Hall       Hall   `json:"hall"`
}

type Seat struct {
	SeatID     int     `json:"seatId"`
	SeatNumber string  `json:"seatNumber"`
	SeatRow    string  `json:"seatRow"`
	Status     string  `json:"status"` // AVAILABLE / BOOKED / BLOCKED, computed per showtime
	Price      float64 `json:"price"`
}

type Food struct {
	FoodID      int     `json:"foodId"`
	FoodNumber  string  `json:"foodNumber"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	FoodImage   string  `json:"foodImage"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
}

type Review struct {
	ReviewID     int    `json:"reviewId"`
	UserFullName string `json:"userFullName"`
	TargetID     int    `json:"targetId"`
	TargetTable  string `json:"targetTable"`
	TargetName   string `json:"targetName"`
	Rating       int    `json:"rating"`
	ReviewText   string `json:"reviewText"`
	ReviewDate   string `json:"reviewDate"`
}

type User struct {
	UserID      int    `json:"userId"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	FullName    string `json:"fullName"`
	PhoneNumber string `json:"phoneNumber"`
	BirthDate   string `json:"birthDate"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

type FoodLine struct {
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
	Subtotal  float64 `json:"subtotal"`
}

type Ticket struct {
	ReferenceNo int        `json:"referenceNo"`
	MovieTitle  string     `json:"movieTitle"`
	CinemaName  string     `json:"cinemaName"`
	HallName    string     `json:"hallName"`
	ShowDate    string     `json:"showDate"`
	Seats       []string   `json:"seats"`
	Foods       []FoodLine `json:"foods"`
	TotalAmount float64    `json:"totalAmount"`
	PurchasedAt string     `json:"purchasedAt"`
}
