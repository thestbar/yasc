package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
)

type ActivityService struct {
	db *bun.DB
}

func NewActivityService(db *bun.DB) *ActivityService {
	return &ActivityService{db: db}
}

type SplitMeta struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Amount int64  `json:"amount"`
}

func (s *ActivityService) log(ctx context.Context, actorID string, groupID, expenseID, settlementID *string, typ string, meta map[string]any) {
	entry := &models.ActivityLog{
		ID:           uuid.New().String(),
		Type:         typ,
		ActorID:      actorID,
		GroupID:      groupID,
		ExpenseID:    expenseID,
		SettlementID: settlementID,
		Metadata:     meta,
		CreatedAt:    time.Now(),
	}
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	_, _ = s.db.NewInsert().Model(entry).Exec(ctx)
}

func (s *ActivityService) LogExpenseCreated(ctx context.Context, actorID, groupID, expenseID, description string, amount int64, currency, paidByID, paidByName string, splits []SplitMeta, affectedUserIDs []string) {
	s.log(ctx, actorID, &groupID, &expenseID, nil, "expense_added", map[string]any{
		"description":     description,
		"amount":          amount,
		"currency":        currency,
		"paidById":        paidByID,
		"paidByName":      paidByName,
		"splits":          splits,
		"affectedUserIds": affectedUserIDs,
	})
}

func (s *ActivityService) LogExpenseUpdated(ctx context.Context, actorID, groupID, expenseID, description string, amount int64, currency, paidByID, paidByName string, splits []SplitMeta, affectedUserIDs []string) {
	s.log(ctx, actorID, &groupID, &expenseID, nil, "expense_updated", map[string]any{
		"description":     description,
		"amount":          amount,
		"currency":        currency,
		"paidById":        paidByID,
		"paidByName":      paidByName,
		"splits":          splits,
		"affectedUserIds": affectedUserIDs,
	})
}

func (s *ActivityService) LogExpenseDeleted(ctx context.Context, actorID, groupID string, affectedUserIDs []string, meta map[string]any) {
	if meta == nil {
		meta = map[string]any{}
	}
	meta["affectedUserIds"] = affectedUserIDs
	s.log(ctx, actorID, &groupID, nil, nil, "expense_deleted", meta)
}

func (s *ActivityService) LogSettlementCreated(ctx context.Context, actorID, groupID, settlementID, fromUserID, fromUserName, toUserID, toUserName string, amount int64, currency string) {
	s.log(ctx, actorID, &groupID, nil, &settlementID, "settlement_recorded", map[string]any{
		"fromUserId":      fromUserID,
		"fromUserName":    fromUserName,
		"toUserId":        toUserID,
		"toUserName":      toUserName,
		"amount":          amount,
		"currency":        currency,
		"affectedUserIds": []string{fromUserID, toUserID},
	})
}

func (s *ActivityService) LogSettlementDeleted(ctx context.Context, actorID, groupID, fromUserID, fromUserName, toUserID, toUserName string, amount int64, currency string) {
	s.log(ctx, actorID, &groupID, nil, nil, "settlement_deleted", map[string]any{
		"fromUserId":      fromUserID,
		"fromUserName":    fromUserName,
		"toUserId":        toUserID,
		"toUserName":      toUserName,
		"amount":          amount,
		"currency":        currency,
		"affectedUserIds": []string{fromUserID, toUserID},
	})
}

func (s *ActivityService) LogExpensesConverted(ctx context.Context, actorID, groupID, targetCurrency string, converted, skipped int) {
	s.log(ctx, actorID, &groupID, nil, nil, "expenses_converted", map[string]any{
		"targetCurrency": targetCurrency,
		"converted":      converted,
		"skipped":        skipped,
	})
}

func (s *ActivityService) LogMemberJoined(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_joined", nil)
}

func (s *ActivityService) LogMemberAdded(ctx context.Context, actorID, groupID, addedUserID, addedUserName string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_added", map[string]any{
		"addedUserId":   addedUserID,
		"addedUserName": addedUserName,
	})
}

func (s *ActivityService) LogMemberLeft(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_left", nil)
}

func (s *ActivityService) LogMemberRemoved(ctx context.Context, actorID, groupID, removedUserID, removedUserName string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_removed", map[string]any{
		"removedUserId":   removedUserID,
		"removedUserName": removedUserName,
	})
}

func (s *ActivityService) LogGroupCreated(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "group_created", nil)
}

func (s *ActivityService) LogGroupUpdated(ctx context.Context, actorID, groupID string, changedFields []string) {
	s.log(ctx, actorID, &groupID, nil, nil, "group_updated", map[string]any{
		"changedFields": changedFields,
	})
}
