package services_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/thestbar/yasc/api/internal/services"
)

func p64(v float64) *float64 { return &v }
func i64(v int64) *int64     { return &v }

func sum(inputs []services.SplitInput) int64 {
	var s int64
	for _, i := range inputs {
		s += i.Amount
	}
	return s
}

func TestEqualSplit(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a"}, {UserID: "b"}, {UserID: "c"}}

	result, err := services.ValidateEqualSplit(1000, inputs)
	require.NoError(t, err)
	assert.Equal(t, int64(1000), sum(result))
	// remainder (1000 % 3 = 1) goes to first slot
	assert.Equal(t, int64(334), result[0].Amount)
	assert.Equal(t, int64(333), result[1].Amount)
	assert.Equal(t, int64(333), result[2].Amount)
}

func TestEqualSplitDivisible(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a"}, {UserID: "b"}}
	result, err := services.ValidateEqualSplit(300, inputs)
	require.NoError(t, err)
	assert.Equal(t, int64(300), sum(result))
	assert.Equal(t, int64(150), result[0].Amount)
}

func TestEqualSplitEmpty(t *testing.T) {
	_, err := services.ValidateEqualSplit(100, nil)
	assert.Error(t, err)
}

func TestPercentageSplit(t *testing.T) {
	inputs := []services.SplitInput{
		{UserID: "a", Percentage: p64(60)},
		{UserID: "b", Percentage: p64(40)},
	}
	result, err := services.ValidatePercentageSplit(1000, inputs)
	require.NoError(t, err)
	assert.Equal(t, int64(1000), sum(result))
	assert.Equal(t, int64(600), result[0].Amount)
	assert.Equal(t, int64(400), result[1].Amount)
}

func TestPercentageSplitInvalidSum(t *testing.T) {
	inputs := []services.SplitInput{
		{UserID: "a", Percentage: p64(50)},
		{UserID: "b", Percentage: p64(30)},
	}
	_, err := services.ValidatePercentageSplit(1000, inputs)
	assert.Error(t, err)
}

func TestPercentageSplitMissingField(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a"}}
	_, err := services.ValidatePercentageSplit(1000, inputs)
	assert.Error(t, err)
}

func TestExactSplitValid(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a", Amount: 700}, {UserID: "b", Amount: 300}}
	err := services.ValidateExactSplit(1000, inputs)
	assert.NoError(t, err)
}

func TestExactSplitInvalid(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a", Amount: 600}, {UserID: "b", Amount: 300}}
	err := services.ValidateExactSplit(1000, inputs)
	assert.Error(t, err)
}

func TestSharesSplit(t *testing.T) {
	inputs := []services.SplitInput{
		{UserID: "a", Shares: i64(2)},
		{UserID: "b", Shares: i64(1)},
		{UserID: "c", Shares: i64(1)},
	}
	result, err := services.ValidateSharesSplit(1000, inputs)
	require.NoError(t, err)
	assert.Equal(t, int64(1000), sum(result))
	assert.Equal(t, int64(500), result[0].Amount)
}

func TestSharesSplitZero(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a", Shares: i64(0)}}
	_, err := services.ValidateSharesSplit(100, inputs)
	assert.Error(t, err)
}

func TestSharesSplitMissingField(t *testing.T) {
	inputs := []services.SplitInput{{UserID: "a"}}
	_, err := services.ValidateSharesSplit(100, inputs)
	assert.Error(t, err)
}
