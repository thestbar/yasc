package main

import (
	"context"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/thestbar/yasc/api/internal/config"
	dbpkg "github.com/thestbar/yasc/api/internal/db"
	"github.com/thestbar/yasc/api/internal/handlers"
	appmw "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/mailer"
	"github.com/thestbar/yasc/api/internal/services"
)

func main() {
	cfg := config.Load()

	db, err := dbpkg.Connect(cfg)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer db.Close()

	if err := dbpkg.RunMigrations(context.Background(), db); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	mail := mailer.New(cfg)
	actSvc := services.NewActivityService(db)

	// Handlers
	authH := handlers.NewAuthHandler(db, cfg, mail)
	usersH := handlers.NewUsersHandler(db)
	friendsH := handlers.NewFriendsHandler(db, mail)
	groupsH := handlers.NewGroupsHandler(db, actSvc)
	expensesH := handlers.NewExpensesHandler(db, actSvc, cfg)
	settlementsH := handlers.NewSettlementsHandler(db, actSvc)
	currencyH := handlers.NewCurrencyHandler(db, cfg)
	activityH := handlers.NewActivityHandler(db)

	currencyH.StartScheduler()

	e := echo.New()
	e.HideBanner = true

	// Global middleware
	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderAuthorization, echo.HeaderContentType},
	}))

	e.HTTPErrorHandler = func(err error, c echo.Context) {
		he, ok := err.(*echo.HTTPError)
		if !ok {
			_ = c.JSON(http.StatusInternalServerError, map[string]any{"statusCode": 500, "message": "internal server error"})
			return
		}
		_ = c.JSON(he.Code, map[string]any{"statusCode": he.Code, "message": he.Message})
	}

	api := e.Group("/api")

	// Public routes
	auth := api.Group("/auth")
	auth.POST("/register", authH.Register)
	auth.POST("/login", authH.Login)
	auth.POST("/refresh", authH.Refresh)
	auth.POST("/logout", authH.Logout)
	auth.POST("/forgot-password", authH.ForgotPassword)
	auth.POST("/reset-password", authH.ResetPassword)

	// Public invite preview
	api.GET("/groups/join/:inviteCode", groupsH.JoinPreview)

	// Protected routes
	protected := api.Group("", appmw.JWTAuth(cfg))

	protected.GET("/users/me", usersH.Me)
	protected.PATCH("/users/me", usersH.UpdateMe)
	protected.PATCH("/users/me/password", usersH.UpdatePassword)
	protected.DELETE("/users/me", usersH.DeleteMe)
	protected.GET("/users/search", usersH.Search)

	protected.GET("/friends", friendsH.List)
	protected.GET("/friends/requests", friendsH.Requests)
	protected.GET("/friends/sent", friendsH.Sent)
	protected.POST("/friends/request", friendsH.SendRequest)
	protected.POST("/friends/request/:id/accept", friendsH.AcceptRequest)
	protected.POST("/friends/request/:id/decline", friendsH.DeclineRequest)
	protected.DELETE("/friends/:id", friendsH.Delete)

	protected.GET("/groups", groupsH.List)
	protected.POST("/groups", groupsH.Create)
	protected.GET("/groups/:id", groupsH.Get)
	protected.PATCH("/groups/:id", groupsH.Update)
	protected.DELETE("/groups/:id", groupsH.Delete)
	protected.GET("/groups/:id/members", groupsH.ListMembers)
	protected.POST("/groups/:id/members", groupsH.AddMember)
	protected.DELETE("/groups/:id/members/:userId", groupsH.RemoveMember)
	protected.POST("/groups/:id/leave", groupsH.Leave)
	protected.POST("/groups/:id/invite/regenerate", groupsH.RegenerateInvite)
	protected.POST("/groups/join/:inviteCode", groupsH.Join)
	protected.GET("/groups/:id/is-member", groupsH.IsMember)
	protected.GET("/groups/:id/balances", groupsH.Balances)

	protected.GET("/groups/:groupId/expenses", expensesH.List)
	protected.POST("/groups/:groupId/expenses", expensesH.Create)
	protected.GET("/groups/:groupId/expenses/:id", expensesH.Get)
	protected.PATCH("/groups/:groupId/expenses/:id", expensesH.Update)
	protected.DELETE("/groups/:groupId/expenses/:id", expensesH.Delete)
	protected.GET("/groups/:groupId/expenses/:id/convert-preview", expensesH.ConvertPreview)
	protected.POST("/groups/:groupId/expenses/:id/convert", expensesH.Convert)

	protected.GET("/groups/:groupId/settlements", settlementsH.List)
	protected.POST("/groups/:groupId/settlements", settlementsH.Create)
	protected.DELETE("/groups/:groupId/settlements/:id", settlementsH.Delete)

	protected.GET("/currency/rates", currencyH.Rates)

	protected.GET("/activity", activityH.Feed)

	log.Printf("starting on :%s (env=%s)", cfg.Port, cfg.Env)
	log.Fatal(e.Start(":" + cfg.Port))
}
