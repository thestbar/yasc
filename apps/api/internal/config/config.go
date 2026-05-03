package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	JWTExpiry     string // e.g. "15m"
	RefreshExpiry string // e.g. "7d" (parsed manually)
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPass      string
	SMTPFrom      string
	AppURL        string
	Env           string
	FrankfurterURL string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:           getEnv("PORT", "3000"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://yasc:yasc@localhost:5432/yasc?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", "changeme-in-production"),
		JWTExpiry:      getEnv("JWT_EXPIRY", "15m"),
		RefreshExpiry:  getEnv("REFRESH_EXPIRY", "168h"),
		SMTPHost:       getEnv("SMTP_HOST", "localhost"),
		SMTPPort:       getEnv("SMTP_PORT", "1025"),
		SMTPUser:       getEnv("SMTP_USER", ""),
		SMTPPass:       getEnv("SMTP_PASS", ""),
		SMTPFrom:       getEnv("SMTP_FROM", "noreply@yasc.app"),
		AppURL:         getEnv("APP_URL", "http://localhost:5173"),
		Env:            getEnv("ENV", "development"),
		FrankfurterURL: getEnv("FRANKFURTER_URL", "http://frankfurter:8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
