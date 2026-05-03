package services

import (
	"errors"
	"math"
)

type SplitInput struct {
	UserID     string
	Amount     int64
	Percentage *float64
	Shares     *int64
}

func ValidateEqualSplit(total int64, inputs []SplitInput) ([]SplitInput, error) {
	n := int64(len(inputs))
	if n == 0 {
		return nil, errors.New("split requires at least one member")
	}
	base := total / n
	remainder := total % n
	out := make([]SplitInput, n)
	for i, inp := range inputs {
		out[i] = inp
		if int64(i) < remainder {
			out[i].Amount = base + 1
		} else {
			out[i].Amount = base
		}
	}
	return out, nil
}

func ValidatePercentageSplit(total int64, inputs []SplitInput) ([]SplitInput, error) {
	var sum float64
	for _, inp := range inputs {
		if inp.Percentage == nil {
			return nil, errors.New("percentage split requires percentage on every split")
		}
		sum += *inp.Percentage
	}
	if math.Abs(sum-100) > 0.01 {
		return nil, errors.New("percentages must sum to 100")
	}
	out := make([]SplitInput, len(inputs))
	var assigned int64
	for i, inp := range inputs {
		out[i] = inp
		out[i].Amount = int64(math.Round((*inp.Percentage / 100) * float64(total)))
		assigned += out[i].Amount
	}
	// fix drift on last
	out[len(out)-1].Amount += total - assigned
	return out, nil
}

func ValidateExactSplit(total int64, inputs []SplitInput) error {
	var sum int64
	for _, inp := range inputs {
		sum += inp.Amount
	}
	if sum != total {
		return errors.New("split amounts do not sum to expense total")
	}
	return nil
}

func ValidateSharesSplit(total int64, inputs []SplitInput) ([]SplitInput, error) {
	var totalShares int64
	for _, inp := range inputs {
		if inp.Shares == nil {
			return nil, errors.New("shares split requires shares on every split")
		}
		totalShares += *inp.Shares
	}
	if totalShares == 0 {
		return nil, errors.New("total shares must be greater than zero")
	}
	out := make([]SplitInput, len(inputs))
	var assigned int64
	for i, inp := range inputs {
		out[i] = inp
		out[i].Amount = int64(math.Round(float64(*inp.Shares) / float64(totalShares) * float64(total)))
		assigned += out[i].Amount
	}
	out[len(out)-1].Amount += total - assigned
	return out, nil
}
