package services

import (
	"github.com/thestbar/yasc/api/internal/models"
)

// CurrencyBalance is a user's net amount in a specific currency.
// Positive = they are owed money; negative = they owe money.
type CurrencyBalance struct {
	UserID   string
	Currency string
	Amount   int64
}

// CurrencyDebt is a directed payment needed to settle balances.
type CurrencyDebt struct {
	FromUserID string
	ToUserID   string
	Amount     int64
	Currency   string
}

// CalculateGroupBalances computes net amounts per user per currency across all
// expenses and settlements.
func CalculateGroupBalances(expenses []*models.Expense, settlements []*models.Settlement) []CurrencyBalance {
	// net[userId][currency] = net amount
	net := make(map[string]map[string]int64)

	ensure := func(uid, curr string) {
		if net[uid] == nil {
			net[uid] = make(map[string]int64)
		}
	}

	for _, e := range expenses {
		curr := e.Currency
		ensure(e.PaidByID, curr)
		net[e.PaidByID][curr] += e.Amount
		for _, s := range e.Splits {
			ensure(s.UserID, curr)
			net[s.UserID][curr] -= s.Amount
		}
	}

	for _, s := range settlements {
		curr := s.Currency
		ensure(s.FromUserID, curr)
		ensure(s.ToUserID, curr)
		net[s.FromUserID][curr] += s.Amount
		net[s.ToUserID][curr] -= s.Amount
	}

	out := make([]CurrencyBalance, 0)
	for uid, currencies := range net {
		for curr, amt := range currencies {
			out = append(out, CurrencyBalance{UserID: uid, Currency: curr, Amount: amt})
		}
	}
	return out
}

// SimplifyDebts minimises the number of transactions needed to settle all
// balances, operating independently per currency.
func SimplifyDebts(balances []CurrencyBalance) []CurrencyDebt {
	byCurrency := make(map[string][]CurrencyBalance)
	for _, b := range balances {
		byCurrency[b.Currency] = append(byCurrency[b.Currency], b)
	}

	var result []CurrencyDebt
	for curr, bals := range byCurrency {
		for _, d := range simplifyWithinCurrency(bals) {
			result = append(result, CurrencyDebt{
				FromUserID: d.FromUserID,
				ToUserID:   d.ToUserID,
				Amount:     d.Amount,
				Currency:   curr,
			})
		}
	}
	return result
}

func simplifyWithinCurrency(balances []CurrencyBalance) []CurrencyDebt {
	creditors := make([]CurrencyBalance, 0)
	debtors := make([]CurrencyBalance, 0)

	for _, b := range balances {
		if b.Amount > 0 {
			creditors = append(creditors, b)
		} else if b.Amount < 0 {
			debtors = append(debtors, CurrencyBalance{UserID: b.UserID, Amount: -b.Amount})
		}
	}

	var result []CurrencyDebt
	ci, di := 0, 0
	for ci < len(creditors) && di < len(debtors) {
		settle := creditors[ci].Amount
		if debtors[di].Amount < settle {
			settle = debtors[di].Amount
		}
		result = append(result, CurrencyDebt{
			FromUserID: debtors[di].UserID,
			ToUserID:   creditors[ci].UserID,
			Amount:     settle,
		})
		creditors[ci].Amount -= settle
		debtors[di].Amount -= settle
		if creditors[ci].Amount == 0 {
			ci++
		}
		if debtors[di].Amount == 0 {
			di++
		}
	}
	return result
}
