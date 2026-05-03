package mailer

import (
	"bytes"
	"html/template"
	"log"
	"strconv"

	mail "github.com/wneessen/go-mail"
	"github.com/thestbar/yasc/api/internal/config"
)

type Mailer struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) Send(to, subject, htmlBody string) {
	port, _ := strconv.Atoi(m.cfg.SMTPPort)

	msg := mail.NewMsg()
	_ = msg.From(m.cfg.SMTPFrom)
	_ = msg.To(to)
	msg.Subject(subject)
	msg.SetBodyString(mail.TypeTextHTML, htmlBody)

	opts := []mail.Option{
		mail.WithPort(port),
		mail.WithTLSPolicy(mail.NoTLS),
	}
	if m.cfg.SMTPUser != "" {
		opts = append(opts, mail.WithSMTPAuth(mail.SMTPAuthPlain))
		opts = append(opts, mail.WithUsername(m.cfg.SMTPUser))
		opts = append(opts, mail.WithPassword(m.cfg.SMTPPass))
	}

	c, err := mail.NewClient(m.cfg.SMTPHost, opts...)
	if err != nil {
		log.Printf("mailer: create client: %v", err)
		return
	}

	if err := c.DialAndSend(msg); err != nil {
		log.Printf("mailer: send to %s: %v", to, err)
	}
}

func (m *Mailer) SendWelcome(to, displayName string) {
	go func() {
		body := renderTemplate("welcome", map[string]string{
			"DisplayName": displayName,
			"AppURL":      m.cfg.AppURL,
		})
		m.Send(to, "Welcome to YASC!", body)
	}()
}

func (m *Mailer) SendPasswordReset(to, resetURL string) {
	go func() {
		body := renderTemplate("reset_password", map[string]string{
			"ResetURL": resetURL,
			"AppURL":   m.cfg.AppURL,
		})
		m.Send(to, "Reset your YASC password", body)
	}()
}

func (m *Mailer) SendFriendRequest(to, fromDisplayName, appURL string) {
	go func() {
		body := renderTemplate("friend_request", map[string]string{
			"FromDisplayName": fromDisplayName,
			"AppURL":          appURL,
		})
		m.Send(to, fromDisplayName+" sent you a friend request on YASC", body)
	}()
}

func renderTemplate(name string, data any) string {
	tmplStr, ok := emailTemplates[name]
	if !ok {
		return ""
	}
	t, err := template.New(name).Parse(tmplStr)
	if err != nil {
		return ""
	}
	var buf bytes.Buffer
	_ = t.Execute(&buf, data)
	return buf.String()
}

var emailTemplates = map[string]string{
	"welcome": `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
<h2>Welcome to YASC, {{.DisplayName}}!</h2>
<p>You're all set to start splitting expenses with friends.</p>
<p><a href="{{.AppURL}}" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Open YASC</a></p>
</body></html>`,

	"reset_password": `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
<h2>Reset your password</h2>
<p>Click the link below to reset your password. This link expires in 15 minutes.</p>
<p><a href="{{.ResetURL}}" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Reset Password</a></p>
<p style="color:#6B7280;font-size:12px">If you didn't request this, you can ignore this email.</p>
</body></html>`,

	"friend_request": `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
<h2>Friend request from {{.FromDisplayName}}</h2>
<p>{{.FromDisplayName}} wants to be your friend on YASC.</p>
<p><a href="{{.AppURL}}/friends" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">View Request</a></p>
</body></html>`,
}
