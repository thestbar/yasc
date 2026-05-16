package services_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/thestbar/yasc/api/internal/services"
)

func TestCalculateGroupBalances(t *testing.T) {
	alice := "alice"
	bob := "bob"
	carol := "carol"

	// Alice paid 300, equal split: each owes 100
	expense := &models.Expense{
		PaidByID: alice,
		Amount:   300,
		Currency: "USD",
		Splits: []*models.ExpenseSplit{
			{UserID: alice, Amount: 100},
			{UserID: bob, Amount: 100},
			{UserID: carol, Amount: 100},
		},
	}

	balances := services.CalculateGroupBalances([]*models.Expense{expense}, nil)

	find := func(uid string) int64 {
		for _, b := range balances {
			if b.UserID == uid && b.Currency == "USD" {
				return b.Amount
			}
		}
		return 0
	}

	assert.Equal(t, int64(200), find(alice))  // paid 300, owes 100 → +200
	assert.Equal(t, int64(-100), find(bob))
	assert.Equal(t, int64(-100), find(carol))
}

func TestBalancesSettlementOffset(t *testing.T) {
	alice := "alice"
	bob := "bob"
	carol := "carol"

	expense := &models.Expense{
		PaidByID: alice, Amount: 300,
		Currency: "USD",
		Splits: []*models.ExpenseSplit{
			{UserID: alice, Amount: 100},
			{UserID: bob, Amount: 100},
			{UserID: carol, Amount: 100},
		},
	}
	settlement := &models.Settlement{
		FromUserID: bob, ToUserID: alice, Amount: 100, Currency: "USD",
	}

	balances := services.CalculateGroupBalances([]*models.Expense{expense}, []*models.Settlement{settlement})
	for _, b := range balances {
		if b.UserID == bob && b.Currency == "USD" {
			assert.Equal(t, int64(0), b.Amount)
		}
	}
}

func TestSimplifyDebts(t *testing.T) {
	// A owes 200, B gets 100, C gets 100
	balances := []services.CurrencyBalance{
		{UserID: "A", Currency: "USD", Amount: -200},
		{UserID: "B", Currency: "USD", Amount: 100},
		{UserID: "C", Currency: "USD", Amount: 100},
	}

	debts := services.SimplifyDebts(balances)
	var total int64
	for _, d := range debts {
		total += d.Amount
	}
	assert.Equal(t, int64(200), total)
	assert.LessOrEqual(t, len(debts), 2)
}

func TestSimplifyDebtsEmpty(t *testing.T) {
	assert.Empty(t, services.SimplifyDebts(nil))
}

func TestSimplifyDebtsMutualCancel(t *testing.T) {
	balances := []services.CurrencyBalance{
		{UserID: "A", Currency: "USD", Amount: 100},
		{UserID: "B", Currency: "USD", Amount: -100},
	}
	debts := services.SimplifyDebts(balances)
	assert.Len(t, debts, 1)
	assert.Equal(t, "B", debts[0].FromUserID)
	assert.Equal(t, "A", debts[0].ToUserID)
	assert.Equal(t, int64(100), debts[0].Amount)
}
