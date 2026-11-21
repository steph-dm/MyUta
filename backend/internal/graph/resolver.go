// Package graph is the GraphQL layer: thin resolvers that convert between the
// API types and the services. Related objects are loaded through dataloaders.
package graph

import "github.com/steph-dm/MyUta/backend/internal/service"

//go:generate go tool gqlgen generate

// Resolver is the root resolver.
type Resolver struct {
	Services *service.Services
}
