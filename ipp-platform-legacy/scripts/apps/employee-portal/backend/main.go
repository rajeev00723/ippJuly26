package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/lib/pq"
)

// Employee represents an employee record.
type Employee struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Department string `json:"department"`
	Role       string `json:"role"`
	StartDate  string `json:"start_date"`
	CreatedAt  string `json:"created_at,omitempty"`
}

// HealthResponse is returned by the /health endpoint.
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Namespace string    `json:"namespace"`
	Version   string    `json:"version"`
	Database  string    `json:"database"`
}

var db *sql.DB
var dbMu sync.Mutex

// demoMu protects demoEmployees when the DB is unavailable and writes hit the in-memory slice.
var demoMu sync.Mutex
var demoNextID = 11 // one past the last seed record

// demoEmployees is returned when the database is unavailable.
var demoEmployees = []Employee{
	{ID: 1, Name: "Alice Johnson", Email: "alice.johnson@acme.com", Department: "Engineering", Role: "Senior Software Engineer", StartDate: "2020-03-15"},
	{ID: 2, Name: "Bob Smith", Email: "bob.smith@acme.com", Department: "Engineering", Role: "Platform Engineer", StartDate: "2019-07-01"},
	{ID: 3, Name: "Carol White", Email: "carol.white@acme.com", Department: "Product", Role: "Product Manager", StartDate: "2021-01-10"},
	{ID: 4, Name: "David Brown", Email: "david.brown@acme.com", Department: "Security", Role: "Security Engineer", StartDate: "2022-05-20"},
	{ID: 5, Name: "Emily Davis", Email: "emily.davis@acme.com", Department: "Engineering", Role: "Frontend Engineer", StartDate: "2021-08-15"},
	{ID: 6, Name: "Frank Miller", Email: "frank.miller@acme.com", Department: "Operations", Role: "SRE", StartDate: "2020-11-30"},
	{ID: 7, Name: "Grace Wilson", Email: "grace.wilson@acme.com", Department: "Engineering", Role: "Backend Engineer", StartDate: "2022-02-14"},
	{ID: 8, Name: "Henry Moore", Email: "henry.moore@acme.com", Department: "Finance", Role: "Finance Analyst", StartDate: "2019-03-01"},
	{ID: 9, Name: "Isabella Taylor", Email: "isabella.taylor@acme.com", Department: "HR", Role: "HR Manager", StartDate: "2020-09-01"},
	{ID: 10, Name: "James Anderson", Email: "james.anderson@acme.com", Department: "Engineering", Role: "DevOps Engineer", StartDate: "2021-12-01"},
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("error encoding JSON response: %v", err)
	}
}

// getDB returns a live *sql.DB, reconnecting if the connection was lost.
func getDB() *sql.DB {
	dbMu.Lock()
	defer dbMu.Unlock()
	if db != nil {
		if err := db.Ping(); err == nil {
			return db
		}
		// Ping failed — close the stale handle and try to reconnect.
		db.Close()
		db = nil
	}
	// Attempt a single reconnect without blocking the request for long.
	host := getEnv("DB_HOST", "")
	if host == "" {
		return nil
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, getEnv("DB_PORT", "5432"), getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"), getEnv("DB_NAME", "employees"),
	)
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil
	}
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil
	}
	db = conn
	log.Println("DB reconnected successfully")
	return db
}

func dbStatus() string {
	if getEnv("DB_HOST", "") == "" {
		return "demo"
	}
	if conn := getDB(); conn != nil {
		return "connected"
	}
	return "unavailable"
}

// healthHandler handles GET /health
func healthHandler(w http.ResponseWriter, r *http.Request) {
	namespace := getEnv("NAMESPACE", "employee-portal")
	version := getEnv("VERSION", "v1.0.0")

	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC(),
		Namespace: namespace,
		Version:   version,
		Database:  dbStatus(),
	}
	writeJSON(w, http.StatusOK, resp)
}

// readyHandler handles GET /ready
func readyHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

// employeesHandler routes GET and POST for /api/employees
func employeesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getEmployees(w, r)
	case http.MethodPost:
		createEmployee(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// employeeByIDHandler routes DELETE for /api/employees/{id}
func employeeByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deleteEmployee(w, r)
}

// getEmployees handles GET /api/employees
func getEmployees(w http.ResponseWriter, r *http.Request) {
	// Try to query the database first.
	if conn := getDB(); conn != nil {
		{
			rows, err := conn.Query(
				`SELECT id, name, email, department, role, TO_CHAR(start_date, 'YYYY-MM-DD') FROM employees ORDER BY id`,
			)
			if err == nil {
				defer rows.Close()
				var employees []Employee
				for rows.Next() {
					var emp Employee
					if scanErr := rows.Scan(&emp.ID, &emp.Name, &emp.Email, &emp.Department, &emp.Role, &emp.StartDate); scanErr != nil {
						log.Printf("row scan error: %v", scanErr)
						continue
					}
					employees = append(employees, emp)
				}
				if rowsErr := rows.Err(); rowsErr != nil {
					log.Printf("rows iteration error: %v", rowsErr)
				}
				writeJSON(w, http.StatusOK, employees)
				return
			}
			log.Printf("DB query error, falling back to demo data: %v", err)
		}
	}

	// Fallback: return in-memory demo data.
	log.Println("Returning demo employee data (DB not available)")
	writeJSON(w, http.StatusOK, demoEmployees)
}

// createEmployee handles POST /api/employees
func createEmployee(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Department string `json:"department"`
		Role       string `json:"role"`
		StartDate  string `json:"start_date"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Role = strings.TrimSpace(input.Role)
	input.Department = strings.TrimSpace(input.Department)

	if input.Name == "" || input.Email == "" || input.Role == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, email, and role are required"})
		return
	}

	conn := getDB()
	if conn != nil {
		var emp Employee
		var createdAt time.Time
		err := conn.QueryRow(
			`INSERT INTO employees (name, email, department, role, start_date)
			 VALUES ($1, $2, $3, $4, $5::date)
			 RETURNING id, name, email, department, role, TO_CHAR(start_date, 'YYYY-MM-DD'), created_at`,
			input.Name, input.Email, input.Department, input.Role, input.StartDate,
		).Scan(&emp.ID, &emp.Name, &emp.Email, &emp.Department, &emp.Role, &emp.StartDate, &createdAt)
		if err != nil {
			errStr := err.Error()
			if strings.Contains(errStr, "23505") || strings.Contains(errStr, "unique constraint") || strings.Contains(errStr, "duplicate key") {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "email address is already in use"})
				return
			}
			log.Printf("DB insert error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create employee"})
			return
		}
		emp.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		writeJSON(w, http.StatusCreated, emp)
		return
	}

	// DB unavailable — write to in-memory demo slice.
	log.Println("DB not available; creating employee in demo memory")
	demoMu.Lock()
	defer demoMu.Unlock()
	for _, e := range demoEmployees {
		if strings.EqualFold(e.Email, input.Email) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email address is already in use"})
			return
		}
	}
	startDate := input.StartDate
	if startDate == "" {
		startDate = time.Now().UTC().Format("2006-01-02")
	}
	emp := Employee{
		ID:         demoNextID,
		Name:       input.Name,
		Email:      input.Email,
		Department: input.Department,
		Role:       input.Role,
		StartDate:  startDate,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}
	demoNextID++
	demoEmployees = append(demoEmployees, emp)
	writeJSON(w, http.StatusCreated, emp)
}

// deleteEmployee handles DELETE /api/employees/{id}
func deleteEmployee(w http.ResponseWriter, r *http.Request) {
	// Extract {id} from path: /api/employees/{id}
	parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/"), "/")
	if len(parts) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing employee id"})
		return
	}
	rawID := parts[len(parts)-1]
	id, err := strconv.Atoi(rawID)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid employee id"})
		return
	}

	conn := getDB()
	if conn != nil {
		result, dbErr := conn.Exec(`DELETE FROM employees WHERE id = $1`, id)
		if dbErr != nil {
			log.Printf("DB delete error: %v", dbErr)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete employee"})
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "employee not found"})
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// DB unavailable — remove from in-memory demo slice.
	log.Printf("DB not available; deleting employee id=%d from demo memory", id)
	demoMu.Lock()
	defer demoMu.Unlock()
	for i, e := range demoEmployees {
		if e.ID == id {
			demoEmployees = append(demoEmployees[:i], demoEmployees[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "employee not found"})
}

func initDB() {
	host := getEnv("DB_HOST", "")
	if host == "" {
		log.Println("DB_HOST not set — skipping database connection, using demo data")
		return
	}

	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "employees")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)

	// Use a local conn so concurrent getDB() calls never see a half-initialised db.
	// Only write to the package-level db under the lock once the connection is confirmed.
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Printf("Failed to open DB connection: %v — using demo data", err)
		return
	}

	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	// Attempt initial ping with retry — up to 60s to allow postgres to start.
	for i := 0; i < 15; i++ {
		if pingErr := conn.Ping(); pingErr == nil {
			log.Printf("Connected to PostgreSQL at %s:%s/%s", host, port, dbname)
			// Auto-migrate schema so fresh claims never need manual init.sql
			if _, migrateErr := conn.Exec(`
CREATE TABLE IF NOT EXISTS employees (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(50)  NOT NULL,
    role       VARCHAR(100) NOT NULL,
    start_date DATE         NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
)`); migrateErr != nil {
				log.Printf("Schema migration warning: %v", migrateErr)
			} else {
				log.Println("Schema ready (employees table ensured)")
			}
			dbMu.Lock()
			db = conn
			dbMu.Unlock()
			return
		}
		log.Printf("DB ping attempt %d/15 failed, retrying in 4s...", i+1)
		time.Sleep(4 * time.Second)
	}

	log.Println("Could not connect to DB after 15 attempts — will reconnect on first request")
	conn.Close()
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting Employee Portal Backend...")

	go initDB() // non-blocking: HTTP server starts immediately; handlers fall back to demo data until DB is ready

	mux := http.NewServeMux()
	mux.HandleFunc("/health", corsMiddleware(healthHandler))
	mux.HandleFunc("/ready", corsMiddleware(readyHandler))
	mux.HandleFunc("/api/employees/", corsMiddleware(employeeByIDHandler))
	mux.HandleFunc("/api/employees", corsMiddleware(employeesHandler))

	// Root fallback
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			writeJSON(w, http.StatusOK, map[string]string{
				"service": "employee-portal-backend",
				"version": getEnv("VERSION", "v1.0.0"),
			})
			return
		}
		http.NotFound(w, r)
	})

	port := getEnv("PORT", "8080")
	addr := ":" + port
	log.Printf("Listening on %s", addr)

	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
