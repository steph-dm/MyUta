package graph

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/ast"
)

const maxQueryDepth = 10

type DepthLimiter struct{}

var _ graphql.HandlerExtension = DepthLimiter{}
var _ graphql.OperationInterceptor = DepthLimiter{}

func (DepthLimiter) ExtensionName() string {
	return "DepthLimiter"
}

func (DepthLimiter) Validate(_ graphql.ExecutableSchema) error {
	return nil
}

func (DepthLimiter) InterceptOperation(ctx context.Context, next graphql.OperationHandler) graphql.ResponseHandler {
	oc := graphql.GetOperationContext(ctx)
	if oc != nil && oc.Operation != nil {
		depth := queryDepth(oc.Operation.SelectionSet)
		if depth > maxQueryDepth {
			graphql.AddErrorf(ctx, "query depth %d exceeds maximum allowed depth of %d", depth, maxQueryDepth)
			return func(ctx context.Context) *graphql.Response {
				return graphql.ErrorResponse(ctx, "query too deep")
			}
		}
	}
	return next(ctx)
}

func queryDepth(selections ast.SelectionSet) int {
	if len(selections) == 0 {
		return 0
	}

	maxDepth := 0
	for _, sel := range selections {
		var childDepth int
		switch s := sel.(type) {
		case *ast.Field:
			if s.Name == "__typename" {
				continue
			}
			childDepth = 1 + queryDepth(s.SelectionSet)
		case *ast.InlineFragment:
			childDepth = queryDepth(s.SelectionSet)
		case *ast.FragmentSpread:
			if s.Definition != nil {
				childDepth = queryDepth(s.Definition.SelectionSet)
			}
		}
		if childDepth > maxDepth {
			maxDepth = childDepth
		}
	}
	return maxDepth
}
