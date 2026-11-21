// Package mail sends transactional e-mail (password reset, address verification).
package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/config"
)

// Message is a plain-text e-mail.
type Message struct {
	To      string
	Subject string
	Text    string
}

// Sender delivers messages. A nil Sender means e-mail is disabled.
type Sender interface {
	Send(ctx context.Context, m Message) error
}

// New returns an SMTP sender when SMTP is configured, a logging sender in
// development (links appear in the server log), and nil otherwise.
func New(cfg *config.Config) Sender {
	if cfg.SMTP.Enabled() {
		return &SMTPSender{cfg: cfg.SMTP}
	}
	if cfg.IsDevelopment() {
		return LogSender{}
	}
	return nil
}

// LogSender writes messages to the log instead of sending them (development only).
type LogSender struct{}

func (LogSender) Send(_ context.Context, m Message) error {
	slog.Info("e-mail (development: not sent)", "to", m.To, "subject", m.Subject, "body", m.Text)
	return nil
}

// SMTPSender sends through an SMTP server: implicit TLS on port 465,
// STARTTLS (required) on any other port.
type SMTPSender struct{ cfg config.SMTP }

func (s *SMTPSender) Send(ctx context.Context, m Message) error {
	addr := net.JoinHostPort(s.cfg.Host, strconv.Itoa(s.cfg.Port))
	deadline := time.Now().Add(20 * time.Second)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	dialer := &net.Dialer{Deadline: deadline}
	tlsCfg := &tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}

	var conn net.Conn
	var err error
	if s.cfg.Port == 465 {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	_ = conn.SetDeadline(deadline)
	c, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer func() { _ = c.Close() }()

	if s.cfg.Port != 465 {
		if ok, _ := c.Extension("STARTTLS"); !ok {
			return fmt.Errorf("smtp server %s does not offer STARTTLS", s.cfg.Host)
		}
		if err := c.StartTLS(tlsCfg); err != nil {
			return fmt.Errorf("smtp starttls: %w", err)
		}
	}
	if s.cfg.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := c.Mail(envelope(s.cfg.From)); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := c.Rcpt(m.To); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	body := strings.Join([]string{
		"From: " + s.cfg.From,
		"To: " + m.To,
		"Subject: " + mime.QEncoding.Encode("utf-8", m.Subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		strings.ReplaceAll(m.Text, "\n", "\r\n"),
	}, "\r\n")
	if _, err := w.Write([]byte(body)); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close data: %w", err)
	}
	return c.Quit()
}

// envelope extracts the bare address from "Name <addr>".
func envelope(from string) string {
	if i := strings.LastIndex(from, "<"); i >= 0 {
		return strings.TrimSuffix(from[i+1:], ">")
	}
	return from
}
