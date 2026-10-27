package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"

	"backend/internal/cinema"
	"backend/internal/pkg/database"
	"backend/internal/pkg/middleware"
	"backend/internal/user/delivery"
)

func main() {
	// .env is optional: on Render the variables come from the platform environment.
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatalf("加载 .env 失败: %v", err)
	}

	gormDB, err := database.InitSQLite(requiredEnv("DB_PATH"))
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}
	if err := database.RunMigrations(gormDB, migrationsDir); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	db, err := gormDB.DB()
	if err != nil {
		log.Fatalf("获取数据库连接失败: %v", err)
	}
	if err := cinema.SeedDemoGuest(db); err != nil {
		log.Fatalf("初始化演示账号失败: %v", err)
	}

	serverAddress := requiredEnv("SERVER_ADDRESS")
	tokenSecret := requiredEnv("AUTH_SECRET")
	allowedOrigins := splitEnv(requiredEnv("CORS_ALLOWED_ORIGINS"))
	cookieSecure := strings.EqualFold(strings.TrimSpace(os.Getenv("COOKIE_SECURE")), "true")
	devMode := strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "development")

	controller := cinema.NewController(db, tokenSecret, cookieSecure, devMode)
	mux := http.NewServeMux()
	mux.Handle("/api/v1/cinema/", cinema.NewRouter(controller, allowedOrigins))

	log.Printf("[LOG] API server listening on %s", serverAddress)
	log.Fatal(http.ListenAndServe(serverAddress, middleware.Audit(mux, tokenSecret, delivery.VerifyToken)))
}

func requiredEnv(name string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		log.Fatalf("required environment variable %s is not set", name)
	}
	return value
}

func splitEnv(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0)
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
