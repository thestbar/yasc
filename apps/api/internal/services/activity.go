package services

import (
	"context"

	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
)

type ActivityService struct {
	db *bun.DB
}

func NewActivityService(db *bun.DB) *ActivityService {
	return &ActivityService{db: db}
}

func (s *ActivityService) log(ctx context.Context, actorID string, groupID, expenseID, settlementID *string, typ string, meta map[string]any) {
	entry := &models.ActivityLog{
		Type:         typ,
		ActorID:      actorID,
		GroupID:      groupID,
		ExpenseID:    expenseID,
		SettlementID: settlementID,
		Metadata:     meta,
	}
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	_, _ = s.db.NewInsert().Model(entry).Exec(ctx)
}

func (s *ActivityService) LogExpenseCreated(ctx context.Context, actorID, groupID, expenseID string) {
	s.log(ctx, actorID, &groupID, &expenseID, nil, "expense_added", nil)
}

func (s *ActivityService) LogExpenseUpdated(ctx context.Context, actorID, groupID, expenseID string) {
	s.log(ctx, actorID, &groupID, &expenseID, nil, "expense_updated", nil)
}

func (s *ActivityService) LogExpenseDeleted(ctx context.Context, actorID, groupID string, meta map[string]any) {
	s.log(ctx, actorID, &groupID, nil, nil, "expense_deleted", meta)
}

func (s *ActivityService) LogSettlementCreated(ctx context.Context, actorID, groupID, settlementID string) {
	s.log(ctx, actorID, &groupID, nil, &settlementID, "settlement_recorded", nil)
}

func (s *ActivityService) LogMemberJoined(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_joined", nil)
}

func (s *ActivityService) LogMemberLeft(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "member_left", nil)
}

func (s *ActivityService) LogGroupCreated(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "group_created", nil)
}

func (s *ActivityService) LogGroupUpdated(ctx context.Context, actorID, groupID string) {
	s.log(ctx, actorID, &groupID, nil, nil, "group_updated", nil)
}
