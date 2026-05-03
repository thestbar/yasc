package main

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/thestbar/yasc/api/internal/config"
	dbpkg "github.com/thestbar/yasc/api/internal/db"
	"github.com/thestbar/yasc/api/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	db, err := dbpkg.Connect(cfg)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	if err := dbpkg.RunMigrations(ctx, db); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), 12)
	hashStr := string(hash)

	users := []*models.User{
		{ID: uuid.New().String(), Email: "alice@example.com", Username: "alice", DisplayName: "Alice Chen", PasswordHash: hashStr, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New().String(), Email: "bob@example.com", Username: "bob", DisplayName: "Bob Smith", PasswordHash: hashStr, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New().String(), Email: "carol@example.com", Username: "carol", DisplayName: "Carol White", PasswordHash: hashStr, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New().String(), Email: "dave@example.com", Username: "dave", DisplayName: "Dave Brown", PasswordHash: hashStr, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New().String(), Email: "eve@example.com", Username: "eve", DisplayName: "Eve Davis", PasswordHash: hashStr, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	for _, u := range users {
		_, _ = db.NewInsert().Model(u).On("CONFLICT (email) DO NOTHING").Exec(ctx)
	}
	log.Printf("seeded %d users", len(users))

	group1 := &models.Group{
		ID:           uuid.New().String(),
		Name:         "Tokyo Trip 2024",
		SimplifyDebts: true,
		DefaultSplit: "equal",
		InviteCode:   uuid.New().String(),
		CreatedByID:  users[0].ID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	group2 := &models.Group{
		ID:           uuid.New().String(),
		Name:         "Flat Expenses",
		SimplifyDebts: false,
		DefaultSplit: "equal",
		InviteCode:   uuid.New().String(),
		CreatedByID:  users[0].ID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	for _, g := range []*models.Group{group1, group2} {
		_, _ = db.NewInsert().Model(g).On("CONFLICT DO NOTHING").Exec(ctx)
	}

	members := []*models.GroupMember{
		{ID: uuid.New().String(), GroupID: group1.ID, UserID: users[0].ID, Role: "owner", JoinedAt: time.Now()},
		{ID: uuid.New().String(), GroupID: group1.ID, UserID: users[1].ID, Role: "member", JoinedAt: time.Now()},
		{ID: uuid.New().String(), GroupID: group1.ID, UserID: users[2].ID, Role: "member", JoinedAt: time.Now()},
		{ID: uuid.New().String(), GroupID: group2.ID, UserID: users[0].ID, Role: "owner", JoinedAt: time.Now()},
		{ID: uuid.New().String(), GroupID: group2.ID, UserID: users[3].ID, Role: "member", JoinedAt: time.Now()},
		{ID: uuid.New().String(), GroupID: group2.ID, UserID: users[4].ID, Role: "member", JoinedAt: time.Now()},
	}
	for _, m := range members {
		_, _ = db.NewInsert().Model(m).On("CONFLICT (group_id, user_id) DO NOTHING").Exec(ctx)
	}

	// Expenses
	exp1 := &models.Expense{
		ID: uuid.New().String(), GroupID: group1.ID, Description: "Hotel Shinjuku",
		Amount: 45000, Currency: "JPY", Date: "2024-04-10", Category: "accommodation",
		PaidByID: users[0].ID, SplitType: "equal", CreatedByID: users[0].ID,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	exp2 := &models.Expense{
		ID: uuid.New().String(), GroupID: group1.ID, Description: "Sushi dinner",
		Amount: 12000, Currency: "JPY", Date: "2024-04-11", Category: "food",
		PaidByID: users[1].ID, SplitType: "equal", CreatedByID: users[1].ID,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	exp3 := &models.Expense{
		ID: uuid.New().String(), GroupID: group2.ID, Description: "Monthly rent",
		Amount: 180000, Currency: "USD", Date: "2024-05-01", Category: "accommodation",
		PaidByID: users[0].ID, SplitType: "equal", CreatedByID: users[0].ID,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}

	for _, e := range []*models.Expense{exp1, exp2, exp3} {
		if _, err := db.NewInsert().Model(e).Exec(ctx); err != nil {
			continue
		}
	}

	// Equal splits for exp1 (3 members, 45000 JPY → 15000 each)
	for _, uid := range []string{users[0].ID, users[1].ID, users[2].ID} {
		split := &models.ExpenseSplit{
			ID: uuid.New().String(), ExpenseID: exp1.ID, UserID: uid, Amount: 15000,
		}
		_, _ = db.NewInsert().Model(split).Exec(ctx)
	}

	// Equal splits for exp2 (3 members, 12000 JPY → 4000 each)
	for _, uid := range []string{users[0].ID, users[1].ID, users[2].ID} {
		split := &models.ExpenseSplit{
			ID: uuid.New().String(), ExpenseID: exp2.ID, UserID: uid, Amount: 4000,
		}
		_, _ = db.NewInsert().Model(split).Exec(ctx)
	}

	// Equal splits for exp3 (3 members, 180000 USD cents → 60000 each)
	for _, uid := range []string{users[0].ID, users[3].ID, users[4].ID} {
		split := &models.ExpenseSplit{
			ID: uuid.New().String(), ExpenseID: exp3.ID, UserID: uid, Amount: 60000,
		}
		_, _ = db.NewInsert().Model(split).Exec(ctx)
	}

	log.Println("seed complete")
}
