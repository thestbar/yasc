package services

import (
	"github.com/thestbar/yasc/api/internal/models"
)

type Balance struct {
	UserID string  `json:"userId"`
	Amount int64   `json:"amount"`
	User   *models.User `json:"user,omitempty"`
}

type Debt struct {
	FromUserID string `json:"fromUserId"`
	ToUserID   string `json:"toUserId"`
	Amount     int64  `json:"amount"`
}

func CalculateGroupBalances(expenses []*models.Expense, settlements []*models.Settlement) []Balance {
	net := make(map[string]int64)

	for _, e := range expenses {
		net[e.PaidByID] += e.Amount
		for _, s := range e.Splits {
			net[s.UserID] -= s.Amount
		}
	}
	for _, s := range settlements {
		net[s.FromUserID] += s.Amount
		net[s.ToUserID] -= s.Amount
	}

	out := make([]Balance, 0, len(net))
	for uid, amt := range net {
		out = append(out, Balance{UserID: uid, Amount: amt})
	}
	return out
}

func SimplifyDebts(balances []Balance) []Debt {
	creditors := make([]Balance, 0)
	debtors := make([]Balance, 0)

	for _, b := range balances {
		if b.Amount > 0 {
			creditors = append(creditors, b)
		} else if b.Amount < 0 {
			debtors = append(debtors, Balance{UserID: b.UserID, Amount: -b.Amount})
		}
	}

	var result []Debt
	ci, di := 0, 0
	for ci < len(creditors) && di < len(debtors) {
		settle := creditors[ci].Amount
		if debtors[di].Amount < settle {
			settle = debtors[di].Amount
		}
		result = append(result, Debt{
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
