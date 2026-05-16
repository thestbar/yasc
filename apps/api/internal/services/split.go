package services

import (
	"fmt"
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
		return nil, fmt.Errorf("split requires at least one member")
	}
	for _, inp := range inputs {
		if inp.UserID == "" {
			return nil, fmt.Errorf("each split entry must have a userId")
		}
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
	if len(inputs) == 0 {
		return nil, fmt.Errorf("split requires at least one member")
	}
	var sum float64
	for _, inp := range inputs {
		if inp.UserID == "" {
			return nil, fmt.Errorf("each split entry must have a userId")
		}
		if inp.Percentage == nil {
			return nil, fmt.Errorf("percentage split requires a percentage value for every member")
		}
		if *inp.Percentage < 0 {
			return nil, fmt.Errorf("percentages must be non-negative")
		}
		sum += *inp.Percentage
	}
	if math.Abs(sum-100) > 0.01 {
		return nil, fmt.Errorf("percentages sum to %.2f%%, must equal 100%%", sum)
	}
	out := make([]SplitInput, len(inputs))
	var assigned int64
	for i, inp := range inputs {
		out[i] = inp
		out[i].Amount = int64(math.Round((*inp.Percentage / 100) * float64(total)))
		assigned += out[i].Amount
	}
	// fix rounding drift on last entry
	out[len(out)-1].Amount += total - assigned
	return out, nil
}

func ValidateExactSplit(total int64, inputs []SplitInput) error {
	if len(inputs) == 0 {
		return fmt.Errorf("split requires at least one member")
	}
	var sum int64
	for _, inp := range inputs {
		if inp.UserID == "" {
			return fmt.Errorf("each split entry must have a userId")
		}
		if inp.Amount < 0 {
			return fmt.Errorf("split amounts must be non-negative")
		}
		sum += inp.Amount
	}
	if sum != total {
		totalFormatted := fmt.Sprintf("%.2f", float64(total)/100)
		sumFormatted := fmt.Sprintf("%.2f", float64(sum)/100)
		return fmt.Errorf("split amounts sum to %s, but the expense total is %s", sumFormatted, totalFormatted)
	}
	return nil
}

func ValidateSharesSplit(total int64, inputs []SplitInput) ([]SplitInput, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("split requires at least one member")
	}
	var totalShares int64
	for _, inp := range inputs {
		if inp.UserID == "" {
			return nil, fmt.Errorf("each split entry must have a userId")
		}
		if inp.Shares == nil {
			return nil, fmt.Errorf("shares split requires a shares value for every member")
		}
		if *inp.Shares < 0 {
			return nil, fmt.Errorf("share values must be non-negative")
		}
		totalShares += *inp.Shares
	}
	if totalShares == 0 {
		return nil, fmt.Errorf("total shares must be greater than zero")
	}
	out := make([]SplitInput, len(inputs))
	var assigned int64
	for i, inp := range inputs {
		out[i] = inp
		out[i].Amount = int64(math.Round(float64(*inp.Shares) / float64(totalShares) * float64(total)))
		assigned += out[i].Amount
	}
	// fix rounding drift on last entry
	out[len(out)-1].Amount += total - assigned
	return out, nil
}
