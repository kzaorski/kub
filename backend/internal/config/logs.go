// Structured logging with trace context for KUB
//
// OpenTelemetry Logs API is still stabilizing as of Go 1.25+
// This module provides structured logging utilities that automatically
// include trace ID and span ID from the current context.
//
// Usage:
//   logs.InfoCtx(ctx, "message", logs.String("key", "value"))
//   logs.ErrorCtx(ctx, "error message", logs.Err(err))
//
// This enables log-to-trace correlation in your observability backend.

package config

import (
	"context"
	"fmt"
	"log"
	"os"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// Logger provides structured logging with trace context
type Logger struct {
	prefix string
}

// NewLogger creates a new structured logger
func NewLogger(prefix string) *Logger {
	return &Logger{prefix: prefix}
}

// LogField is a key-value pair for structured logging
type LogField struct {
	Key   string
	Value interface{}
}

// String creates a string field
func String(key, value string) LogField {
	return LogField{Key: key, Value: value}
}

// Int creates an int field
func Int(key string, value int) LogField {
	return LogField{Key: key, Value: value}
}

// Int64 creates an int64 field
func Int64(key string, value int64) LogField {
	return LogField{Key: key, Value: value}
}

// Err creates an error field
func Err(err error) LogField {
	if err == nil {
		return LogField{Key: "error", Value: nil}
	}
	return LogField{Key: "error", Value: err.Error()}
}

// Any creates a field with any value
func Any(key string, value interface{}) LogField {
	return LogField{Key: key, Value: value}
}

// extractTraceInfo extracts trace ID and span ID from context
func extractTraceInfo(ctx context.Context) (traceID, spanID string) {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		traceID = span.SpanContext().TraceID().String()
		spanID = span.SpanContext().SpanID().String()
	}
	return
}

// formatFields formats log fields into a string
func formatFields(fields []LogField) string {
	if len(fields) == 0 {
		return ""
	}
	result := " {"
	for i, f := range fields {
		if i > 0 {
			result += ", "
		}
		result += fmt.Sprintf("%s: %v", f.Key, f.Value)
	}
	result += "}"
	return result
}

// InfoCtx logs an info message with trace context
func (l *Logger) InfoCtx(ctx context.Context, msg string, fields ...LogField) {
	traceID, spanID := extractTraceInfo(ctx)
	prefix := l.prefix
	if prefix != "" {
		prefix += ": "
	}

	logStr := fmt.Sprintf("[%s trace_id=%s span_id=%s]%s%s",
		prefix, traceID, spanID, msg, formatFields(fields))
	log.Println(logStr)
}

// ErrorCtx logs an error message with trace context
func (l *Logger) ErrorCtx(ctx context.Context, msg string, fields ...LogField) {
	traceID, spanID := extractTraceInfo(ctx)
	prefix := l.prefix
	if prefix != "" {
		prefix += ": "
	}

	logStr := fmt.Sprintf("[ERROR %s trace_id=%s span_id=%s]%s%s",
		prefix, traceID, spanID, msg, formatFields(fields))
	log.Println(logStr)
}

// WarnCtx logs a warning message with trace context
func (l *Logger) WarnCtx(ctx context.Context, msg string, fields ...LogField) {
	traceID, spanID := extractTraceInfo(ctx)
	prefix := l.prefix
	if prefix != "" {
		prefix += ": "
	}

	logStr := fmt.Sprintf("[WARN %s trace_id=%s span_id=%s]%s%s",
		prefix, traceID, spanID, msg, formatFields(fields))
	log.Println(logStr)
}

// DebugCtx logs a debug message with trace context
func (l *Logger) DebugCtx(ctx context.Context, msg string, fields ...LogField) {
	// Only log debug messages if DEBUG env var is set
	if os.Getenv("DEBUG") == "" || os.Getenv("DEBUG") == "false" {
		return
	}

	traceID, spanID := extractTraceInfo(ctx)
	prefix := l.prefix
	if prefix != "" {
		prefix += ": "
	}

	logStr := fmt.Sprintf("[DEBUG %s trace_id=%s span_id=%s]%s%s",
		prefix, traceID, spanID, msg, formatFields(fields))
	log.Println(logStr)
}

// WithSpanError records an error in the current span and logs it
func (l *Logger) WithSpanError(ctx context.Context, msg string, err error, fields ...LogField) {
	span := trace.SpanFromContext(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, msg)
	}
	fields = append(fields, Err(err))
	l.ErrorCtx(ctx, msg, fields...)
}

// Default logger instance
var defaultLogger = NewLogger("")

// Package-level convenience functions

// InfoCtx logs an info message with trace context
func InfoCtx(ctx context.Context, msg string, fields ...LogField) {
	defaultLogger.InfoCtx(ctx, msg, fields...)
}

// ErrorCtx logs an error message with trace context
func ErrorCtx(ctx context.Context, msg string, fields ...LogField) {
	defaultLogger.ErrorCtx(ctx, msg, fields...)
}

// WarnCtx logs a warning message with trace context
func WarnCtx(ctx context.Context, msg string, fields ...LogField) {
	defaultLogger.WarnCtx(ctx, msg, fields...)
}

// DebugCtx logs a debug message with trace context
func DebugCtx(ctx context.Context, msg string, fields ...LogField) {
	defaultLogger.DebugCtx(ctx, msg, fields...)
}

// WithSpanError records an error in the current span and logs it
func WithSpanError(ctx context.Context, msg string, err error, fields ...LogField) {
	defaultLogger.WithSpanError(ctx, msg, err, fields...)
}

// Common attribute helpers for structured logging

// HTTPAttribute creates an HTTP-related attribute
func HTTPAttribute(key string, value string) LogField {
	return LogField{Key: "http." + key, Value: value}
}

// K8SAttribute creates a Kubernetes-related attribute
func K8SAttribute(key string, value string) LogField {
	return LogField{Key: "k8s." + key, Value: value}
}

// WSAttribute creates a WebSocket-related attribute
func WSAttribute(key string, value string) LogField {
	return LogField{Key: "ws." + key, Value: value}
}

// WatcherAttribute creates a watcher-related attribute
func WatcherAttribute(key string, value string) LogField {
	return LogField{Key: "watcher." + key, Value: value}
}
