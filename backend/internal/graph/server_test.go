package graph

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/service"
)

type gqlResp struct {
	Errors []struct {
		Message    string         `json:"message"`
		Extensions map[string]any `json:"extensions"`
	} `json:"errors"`
}

func post(t *testing.T, h http.Handler, body string) (int, gqlResp) {
	t.Helper()
	r := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	var out gqlResp
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func TestPresenterShowsValidationErrors(t *testing.T) {
	h := NewHandler(&service.Services{}, false)
	cases := map[string]string{
		`{"query":"{ nope }"}`: `Cannot query field "nope"`,
		`{"query":"query($m: MachineType!){ reviews(filter:{machineType:$m}){ totalCount } }","variables":{"m":"UTAU"}}`: "not a valid MachineType",
		`{"query":"{ me { "}`: "Expected Name",
	}
	for body, want := range cases {
		_, resp := post(t, h, body)
		if len(resp.Errors) == 0 || !strings.Contains(resp.Errors[0].Message, want) {
			t.Errorf("%s: got %+v", body, resp.Errors)
		}
	}
}

func TestAuthDirective(t *testing.T) {
	h := NewHandler(&service.Services{}, false)
	_, resp := post(t, h, `{"query":"{ dashboardStats { totalReviews } }"}`)
	if len(resp.Errors) == 0 || resp.Errors[0].Extensions["code"] != string(apperror.CodeUnauthenticated) {
		t.Fatalf("anonymous dashboardStats: %+v", resp.Errors)
	}
}

func TestNoGetTransport(t *testing.T) {
	h := NewHandler(&service.Services{}, false)
	r := httptest.NewRequest(http.MethodGet, "/graphql?query=%7Bme%7Bid%7D%7D", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	if strings.Contains(rec.Body.String(), `"data":{`) {
		t.Fatalf("GET query executed: %s", rec.Body)
	}
}

func TestComplexityLimit(t *testing.T) {
	h := NewHandler(&service.Services{}, false)
	_, resp := post(t, h, `{"query":"{ reviews(limit:100){ items { song { reviews { song { reviews { id } } } } } } }"}`)
	if len(resp.Errors) == 0 || resp.Errors[0].Extensions["code"] != "COMPLEXITY_LIMIT_EXCEEDED" {
		t.Fatalf("expensive query accepted: %+v", resp.Errors)
	}
}

func parse(t *testing.T, q string) *graphql.OperationContext {
	t.Helper()
	schema := NewExecutableSchema(Config{Resolvers: &Resolver{}}).Schema()
	doc, err := gqlparser.LoadQueryWithRules(schema, q, nil)
	if err != nil {
		t.Fatal(err)
	}
	return &graphql.OperationContext{Operation: doc.Operations[0], Doc: doc}
}

func TestLimitsDepthAndRootFields(t *testing.T) {
	deep := "{ review(id:\"x\") { song { artist { songs { artist { songs { artist { songs { artist { songs { artist { id } } } } } } } } } } } }"
	if err := (Limits{}).MutateOperationContext(context.Background(), parse(t, deep)); err == nil || err.Extensions["reason"] != string(apperror.ReasonQueryTooDeep) {
		t.Fatalf("deep query: %v", err)
	}
	var b strings.Builder
	b.WriteString("{")
	for i := range 16 {
		b.WriteString(" a")
		b.WriteString(strings.Repeat("x", i+1))
		b.WriteString(": serverInfo { ocrEnabled }")
	}
	b.WriteString("}")
	if err := (Limits{}).MutateOperationContext(context.Background(), parse(t, b.String())); err == nil || err.Extensions["reason"] != string(apperror.ReasonTooManyFields) {
		t.Fatalf("16 root fields: %v", err)
	}
	if err := (Limits{}).MutateOperationContext(context.Background(), parse(t, "{ me { id } }")); err != nil {
		t.Fatalf("simple query rejected: %v", err)
	}
}
